import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type VehicleRate = Database['public']['Tables']['vehicle_rates']['Row'];
export type AvailabilityBlock = Database['public']['Tables']['availability_blocks']['Row'];
export type MaintenanceRecord = Database['public']['Tables']['vehicle_maintenance_records']['Row'];

export function useVehicles(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['vehicles', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Vehicle[]> => {
      const { data, error } = await getSupabase()
        .from('vehicles')
        .select('*')
        .eq('organization_id', organizationId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useVehicle(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle', vehicleId],
    enabled: Boolean(vehicleId),
    queryFn: async (): Promise<Vehicle> => {
      const { data, error } = await getSupabase()
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useVehicleRates(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-rates', vehicleId],
    enabled: Boolean(vehicleId),
    queryFn: async (): Promise<VehicleRate[]> => {
      const { data, error } = await getSupabase()
        .from('vehicle_rates')
        .select('*')
        .eq('vehicle_id', vehicleId as string)
        .is('effective_to', null)
        .order('rate_type', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAvailabilityBlocks(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['availability-blocks', vehicleId],
    enabled: Boolean(vehicleId),
    queryFn: async (): Promise<AvailabilityBlock[]> => {
      const { data, error } = await getSupabase()
        .from('availability_blocks')
        .select('*')
        .eq('vehicle_id', vehicleId as string)
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateVehicle(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<VehicleInsert, 'organization_id'>) => {
      const { data, error } = await getSupabase()
        .from('vehicles')
        .insert({ ...input, organization_id: organizationId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', organizationId] });
    },
  });
}

export function useUpdateVehicle(vehicleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<VehicleInsert>) => {
      const { data, error } = await getSupabase()
        .from('vehicles')
        .update(input)
        .eq('id', vehicleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', data.organization_id] });
    },
  });
}

interface SetRateInput {
  vehicleId: string;
  rateType: Database['public']['Enums']['rate_type'];
  amountLaari: number | null;
}

export function useSetVehicleRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SetRateInput) => {
      const { data, error } = await getSupabase().rpc('set_vehicle_rate', {
        p_vehicle_id: input.vehicleId,
        p_rate_type: input.rateType,
        p_amount_laari: input.amountLaari,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-rates', variables.vehicleId] });
    },
  });
}

interface CreateBlockInput {
  vehicleId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}

export function useCreateAvailabilityBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBlockInput) => {
      const { data: session } = await getSupabase().auth.getSession();
      const { data, error } = await getSupabase()
        .from('availability_blocks')
        .insert({
          vehicle_id: input.vehicleId,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          reason: input.reason,
          created_by: session.session?.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['availability-blocks', variables.vehicleId] });
    },
  });
}

export function useDeleteAvailabilityBlock(vehicleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await getSupabase().from('availability_blocks').delete().eq('id', blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-blocks', vehicleId] });
    },
  });
}

export function useMaintenanceRecords(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-records', vehicleId],
    enabled: Boolean(vehicleId),
    queryFn: async (): Promise<MaintenanceRecord[]> => {
      const { data, error } = await getSupabase()
        .from('vehicle_maintenance_records')
        .select('*')
        .eq('vehicle_id', vehicleId as string)
        .order('performed_on', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

interface CreateMaintenanceRecordInput {
  organizationId: string;
  vehicleId: string;
  description: string;
  costLaari: number | null;
  odometerKmAtService: number | null;
  performedOn: string;
}

export function useCreateMaintenanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMaintenanceRecordInput): Promise<MaintenanceRecord> => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('vehicle_maintenance_records')
        .insert({
          organization_id: input.organizationId,
          vehicle_id: input.vehicleId,
          description: input.description,
          cost_laari: input.costLaari,
          odometer_km_at_service: input.odometerKmAtService,
          performed_on: input.performedOn,
          recorded_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records', data.vehicle_id] });
    },
  });
}

export function useDeleteMaintenanceRecord(vehicleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await getSupabase().from('vehicle_maintenance_records').delete().eq('id', recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-records', vehicleId] });
    },
  });
}
