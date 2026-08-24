import RideFinderCore
import SwiftUI

/// Port of app/(auth)/sign-in.tsx — Supabase email+password sign-in and
/// account creation, using the SDK directly through ``AuthStore`` rather
/// than a hand-rolled `URLSession` call.
public struct SignInView: View {
    @Environment(AuthStore.self) private var authStore

    @State private var email = ""
    @State private var password = ""
    @State private var isCreatingAccount = false
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    public init() {}

    public var body: some View {
        Form {
            Section {
                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                SecureField("Password", text: $password)
                    .textContentType(isCreatingAccount ? .newPassword : .password)
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(OceanGlassColor.destructive)
                }
            }

            Section {
                Button(isCreatingAccount ? "Create account" : "Sign in") {
                    Task { await submit() }
                }
                .disabled(email.isEmpty || password.isEmpty || isSubmitting)
            }

            Section {
                Button(isCreatingAccount ? "Already have an account? Sign in" : "New here? Create an account") {
                    isCreatingAccount.toggle()
                    errorMessage = nil
                }
            }
        }
        .navigationTitle(isCreatingAccount ? "Create account" : "Sign in")
        .navigationBarTitleDisplayMode(.large)
        .disabled(isSubmitting)
        .overlay {
            if isSubmitting {
                ProgressView()
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }
        do {
            if isCreatingAccount {
                try await authStore.signUp(email: email, password: password)
            } else {
                try await authStore.signIn(email: email, password: password)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
