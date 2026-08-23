import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { Button } from '../../../src/components/Button';
import { GroupedSection } from '../../../src/components/GroupedSection';
import { Screen } from '../../../src/components/Screen';
import { ErrorState } from '../../../src/components/states/ErrorState';
import { LoadingState } from '../../../src/components/states/LoadingState';
import { TextField } from '../../../src/components/TextField';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { Body, Caption } from '../../../src/components/Typography';
import { useTheme } from '../../../src/design-system/ThemeProvider';
import type { Database } from '../../../src/lib/database.types';
import { useCurrentOrganization } from '../../../src/features/organizations/CurrentOrganizationContext';
import { useInviteMember, useOrganizationMembers } from '../../../src/features/organizations/queries';

type OrgRole = Database['public']['Enums']['org_role'];

const ROLE_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
];

/**
 * "Placeholder-level" per the brief: this only adds someone who already
 * has a RideFinder account — there's no invite-by-email-before-signup
 * flow yet (see invite_org_member_by_email in the schema). Owner/manager
 * only, enforced server-side regardless of what this screen shows.
 */
export default function StaffInvitation() {
  const theme = useTheme();
  const { organizationId, role: myRole } = useCurrentOrganization();
  const members = useOrganizationMembers(organizationId);
  const invite = useInviteMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('staff');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  const canManageMembers = myRole === 'owner' || myRole === 'manager';
  const roleOptions =
    myRole === 'owner' ? [...ROLE_OPTIONS, { value: 'owner' as OrgRole, label: 'Owner' }] : ROLE_OPTIONS;

  const handleInvite = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Enter an email address.');
      return;
    }
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    invite.mutate(
      { organizationId, email: trimmed, role },
      {
        onSuccess: () => {
          setSuccessMessage(`${trimmed} added as ${role}.`);
          setEmail('');
        },
        onError: (error) => setErrorMessage(error.message),
      },
    );
  };

  return (
    <Screen
      title="Staff"
      description="Manage who has access to your business."
      scroll
      refreshing={members.isRefetching}
      onRefresh={() => members.refetch()}
    >
      <View style={{ gap: theme.spacing.xl }}>
        {canManageMembers ? (
          <View style={{ gap: theme.spacing.md }} testID="staff-invite-form">
            <TextField
              testID="staff-invite-email"
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="colleague@example.com"
              editable={!invite.isPending}
            />
            <ChipSelect
              testID="staff-invite-role"
              label="Role"
              options={roleOptions}
              value={role}
              onChange={setRole}
            />
            {errorMessage ? (
              <Caption testID="staff-invite-error" accessibilityRole="alert" color={theme.colors.destructive}>
                {errorMessage}
              </Caption>
            ) : null}
            {successMessage ? (
              <Caption testID="staff-invite-success" accessibilityRole="alert" color={theme.colors.success}>
                {successMessage}
              </Caption>
            ) : null}
            <Button
              testID="staff-invite-submit"
              label="Add member"
              onPress={handleInvite}
              loading={invite.isPending}
            />
          </View>
        ) : null}

        <View style={{ gap: theme.spacing.md }}>
          {members.isLoading ? <LoadingState label="Loading team…" /> : null}
          {members.isError ? (
            <ErrorState message={members.error.message} onRetry={() => members.refetch()} />
          ) : null}
          <GroupedSection title="Team">
            <FlatList
              testID="staff-list"
              data={members.data ?? []}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: theme.colors.divider }} />
              )}
              renderItem={({ item }) => (
                <View
                  testID={`staff-member-${item.id}`}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: theme.spacing.sm,
                  }}
                >
                  <Body>
                    {(item.profiles as { full_name?: string; email?: string } | null)?.full_name ??
                      (item.profiles as { full_name?: string; email?: string } | null)?.email ??
                      'Unknown'}
                  </Body>
                  <Caption>
                    {item.role} · {item.status}
                  </Caption>
                </View>
              )}
            />
          </GroupedSection>
        </View>
      </View>
    </Screen>
  );
}
