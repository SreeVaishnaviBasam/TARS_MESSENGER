"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(
    process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export default function ConvexClerkProvider({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY as string}
            appearance={{
                baseTheme: dark,
                variables: {
                    colorPrimary: "#6366f1",
                    colorBackground: "#1a1a2e",
                    colorInputBackground: "#16162a",
                    colorInputText: "#ffffff",
                    colorText: "#e2e8f0",
                    colorTextSecondary: "#94a3b8",
                    colorNeutral: "#e2e8f0",
                    borderRadius: "0.75rem",
                    fontSize: "14px",
                },
                elements: {
                    modalBackdrop: {
                        backgroundColor: "rgba(0, 0, 0, 0.75)",
                        backdropFilter: "blur(8px)",
                    },
                    modalContent: {
                        backgroundColor: "#1a1a2e",
                        borderRadius: "1.25rem",
                        border: "1px solid rgba(99, 102, 241, 0.15)",
                        boxShadow: "0 24px 80px rgba(0, 0, 0, 0.6)",
                    },
                    card: {
                        backgroundColor: "#1a1a2e",
                        borderRadius: "1.25rem",
                        border: "1px solid rgba(99, 102, 241, 0.15)",
                        boxShadow: "0 24px 80px rgba(0, 0, 0, 0.6)",
                    },
                    headerTitle: {
                        color: "#ffffff",
                        fontWeight: "700",
                    },
                    headerSubtitle: {
                        color: "#94a3b8",
                    },
                    formFieldLabel: {
                        color: "#cbd5e1",
                        fontWeight: "500",
                    },
                    formFieldInput: {
                        backgroundColor: "#16162a",
                        borderColor: "rgba(99, 102, 241, 0.2)",
                        color: "#ffffff",
                    },
                    formButtonPrimary: {
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "#ffffff",
                        fontWeight: "600",
                        borderRadius: "0.75rem",
                    },
                    socialButtonsBlockButton: {
                        backgroundColor: "#16162a",
                        borderColor: "rgba(99, 102, 241, 0.2)",
                        color: "#e2e8f0",
                    },
                    dividerLine: {
                        backgroundColor: "rgba(99, 102, 241, 0.15)",
                    },
                    dividerText: {
                        color: "#64748b",
                    },
                    footerAction: {
                        backgroundColor: "#1a1a2e",
                    },
                    footerActionLink: {
                        color: "#6366f1",
                    },
                    footerActionText: {
                        color: "#94a3b8",
                    },
                    formFieldHintText: {
                        color: "#64748b",
                    },
                    formFieldSuccessText: {
                        color: "#22c55e",
                    },
                    formFieldErrorText: {
                        color: "#ef4444",
                    },
                    otpCodeFieldInput: {
                        backgroundColor: "#16162a",
                        borderColor: "rgba(99, 102, 241, 0.2)",
                        color: "#ffffff",
                    },
                    identityPreview: {
                        backgroundColor: "#16162a",
                        borderColor: "rgba(99, 102, 241, 0.2)",
                    },
                    identityPreviewText: {
                        color: "#e2e8f0",
                    },
                    identityPreviewEditButton: {
                        color: "#6366f1",
                    },
                    formResendCodeLink: {
                        color: "#6366f1",
                    },
                    alert: {
                        backgroundColor: "#16162a",
                        borderColor: "rgba(99, 102, 241, 0.2)",
                    },
                    alertText: {
                        color: "#e2e8f0",
                    },
                },
            }}
        >
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                {children}
            </ConvexProviderWithClerk>
        </ClerkProvider>
    );
}
