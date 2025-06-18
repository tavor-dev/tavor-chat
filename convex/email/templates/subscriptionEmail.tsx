/* eslint-disable react-refresh/only-export-components */
import { render } from "@react-email/render";
import {
  Body,
  Head,
  Html,
  Link,
  Img,
  Preview,
  Text,
} from "@react-email/components";
import { sendEmail } from "@cvx/email";
import { SITE_URL } from "@cvx/env";

type SubscriptionEmailOptions = {
  email: string;
  subscriptionId: string;
};

const darkTheme = {
  backgroundColor: "rgba(24, 24, 27, 1)",
  containerBg: "rgba(33, 33, 36, 1)",
  headerBg: "rgba(24, 24, 27, 1)",
  textPrimary: "rgba(244, 244, 245, 1)",
  textSecondary: "rgba(161, 161, 170, 1)",
  textMuted: "rgba(113, 113, 122, 1)",
  accent: "rgba(96, 165, 250, 1)",
  border: "rgba(255, 255, 255, 0.08)",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

/**
 * Templates.
 */
export function SubscriptionSuccessEmail({ email }: SubscriptionEmailOptions) {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Successfully Subscribed to PRO</title>
      </Head>
      <Preview>Successfully Subscribed to PRO</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: darkTheme.fontFamily,
          backgroundColor: darkTheme.backgroundColor,
          color: darkTheme.textPrimary,
          minHeight: "100vh",
        }}
      >
        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          width="100%"
          style={{
            backgroundColor: darkTheme.backgroundColor,
            minHeight: "100vh",
          }}
        >
          <tr>
            <td align="center" style={{ padding: "40px 20px" }}>
              <table
                role="presentation"
                cellPadding="0"
                cellSpacing="0"
                width="600"
                style={{
                  maxWidth: "600px",
                  backgroundColor: darkTheme.containerBg,
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                  border: `1px solid ${darkTheme.border}`,
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      backgroundColor: darkTheme.headerBg,
                      padding: "32px 40px",
                      textAlign: "center",
                      borderBottom: `1px solid ${darkTheme.border}`,
                    }}
                  >
                    <Img
                      src={`${SITE_URL}/logo.png`}
                      width="80"
                      height="80"
                      alt="Logo"
                      style={{
                        display: "inline-block",
                        verticalAlign: "middle",
                        border: 0,
                        borderRadius: "18px",
                      }}
                    />
                    <Text
                      style={{
                        display: "inline-block",
                        margin: "0 0 0 16px",
                        color: darkTheme.textPrimary,
                        fontSize: "28px",
                        fontWeight: 600,
                        verticalAlign: "middle",
                      }}
                    >
                      chat.tavor.dev
                    </Text>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: "40px", textAlign: "left" }}>
                    <Text
                      style={{
                        fontSize: "18px",
                        lineHeight: "28px",
                        margin: "0 0 24px 0",
                        color: darkTheme.textPrimary,
                      }}
                    >
                      Hello {email}!
                    </Text>
                    <Text
                      style={{
                        fontSize: "16px",
                        lineHeight: "26px",
                        margin: "0 0 24px 0",
                        color: darkTheme.textSecondary,
                      }}
                    >
                      Your subscription to PRO has been successfully processed.
                      We hope you enjoy the new features and enhanced
                      experience!
                    </Text>
                    <Text
                      style={{
                        fontSize: "16px",
                        lineHeight: "26px",
                        margin: "0",
                        color: darkTheme.textSecondary,
                      }}
                    >
                      The{" "}
                      <Link
                        href={SITE_URL}
                        style={{
                          color: darkTheme.accent,
                          textDecoration: "none",
                        }}
                      >
                        chat.tavor.dev
                      </Link>{" "}
                      team.
                    </Text>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      backgroundColor: darkTheme.headerBg,
                      padding: "32px 40px",
                      borderTop: `1px solid ${darkTheme.border}`,
                    }}
                  >
                    <Text
                      style={{
                        margin: "0 0 16px 0",
                        color: darkTheme.accent,
                        fontSize: "18px",
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      Build something amazing.
                    </Text>
                    <Text
                      style={{
                        margin: "0",
                        color: darkTheme.textMuted,
                        fontSize: "12px",
                        textAlign: "center",
                      }}
                    >
                      © {new Date().getFullYear()} chat.tavor.dev. Empowering
                      developers worldwide.
                    </Text>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Body>
    </Html>
  );
}

export function SubscriptionErrorEmail({ email }: SubscriptionEmailOptions) {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Subscription Issue - Customer Support</title>
      </Head>
      <Preview>Subscription Issue - Customer Support</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: darkTheme.fontFamily,
          backgroundColor: darkTheme.backgroundColor,
          color: darkTheme.textPrimary,
          minHeight: "100vh",
        }}
      >
        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          width="100%"
          style={{
            backgroundColor: darkTheme.backgroundColor,
            minHeight: "100vh",
          }}
        >
          <tr>
            <td align="center" style={{ padding: "40px 20px" }}>
              <table
                role="presentation"
                cellPadding="0"
                cellSpacing="0"
                width="600"
                style={{
                  maxWidth: "600px",
                  backgroundColor: darkTheme.containerBg,
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                  border: `1px solid ${darkTheme.border}`,
                }}
              >
                {/* Header */}
                <tr>
                  <td
                    style={{
                      backgroundColor: darkTheme.headerBg,
                      padding: "32px 40px",
                      textAlign: "center",
                      borderBottom: `1px solid ${darkTheme.border}`,
                    }}
                  >
                    <Img
                      src={`${SITE_URL}/images/convex-logo-email.jpg`}
                      width="80"
                      height="80"
                      alt="Logo"
                      style={{
                        display: "inline-block",
                        verticalAlign: "middle",
                        border: 0,
                        borderRadius: "18px",
                      }}
                    />
                    <Text
                      style={{
                        display: "inline-block",
                        margin: "0 0 0 16px",
                        color: darkTheme.textPrimary,
                        fontSize: "28px",
                        fontWeight: 600,
                        verticalAlign: "middle",
                      }}
                    >
                      chat.tavor.dev
                    </Text>
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={{ padding: "40px", textAlign: "left" }}>
                    <Text
                      style={{
                        fontSize: "18px",
                        lineHeight: "28px",
                        margin: "0 0 24px 0",
                        color: darkTheme.textPrimary,
                      }}
                    >
                      Hello {email},
                    </Text>
                    <Text
                      style={{
                        fontSize: "16px",
                        lineHeight: "26px",
                        margin: "0 0 24px 0",
                        color: darkTheme.textSecondary,
                      }}
                    >
                      We were unable to process your subscription to PRO tier.
                      Don't worry, we won't charge you anything and our support
                      team will help resolve this issue.
                    </Text>
                    <Text
                      style={{
                        fontSize: "16px",
                        lineHeight: "26px",
                        margin: "0",
                        color: darkTheme.textSecondary,
                      }}
                    >
                      The{" "}
                      <Link
                        href={SITE_URL}
                        style={{
                          color: darkTheme.accent,
                          textDecoration: "none",
                        }}
                      >
                        chat.tavor.dev
                      </Link>{" "}
                      team.
                    </Text>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    style={{
                      backgroundColor: darkTheme.headerBg,
                      padding: "32px 40px",
                      borderTop: `1px solid ${darkTheme.border}`,
                    }}
                  >
                    <Text
                      style={{
                        margin: "0 0 16px 0",
                        color: darkTheme.accent,
                        fontSize: "18px",
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      We're here to help.
                    </Text>
                    <Text
                      style={{
                        margin: "0",
                        color: darkTheme.textMuted,
                        fontSize: "12px",
                        textAlign: "center",
                      }}
                    >
                      © {new Date().getFullYear()} chat.tavor.dev. Empowering
                      developers worldwide.
                    </Text>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Body>
    </Html>
  );
}

/**
 * Renders.
 */
export function renderSubscriptionSuccessEmail(args: SubscriptionEmailOptions) {
  return render(<SubscriptionSuccessEmail {...args} />);
}

export function renderSubscriptionErrorEmail(args: SubscriptionEmailOptions) {
  return render(<SubscriptionErrorEmail {...args} />);
}

/**
 * Senders.
 */
export async function sendSubscriptionSuccessEmail({
  email,
  subscriptionId,
}: SubscriptionEmailOptions) {
  const html = renderSubscriptionSuccessEmail({ email, subscriptionId });

  await sendEmail({
    to: email,
    subject: "Successfully Subscribed to PRO",
    html,
  });
}

export async function sendSubscriptionErrorEmail({
  email,
  subscriptionId,
}: SubscriptionEmailOptions) {
  const html = renderSubscriptionErrorEmail({ email, subscriptionId });

  await sendEmail({
    to: email,
    subject: "Subscription Issue - Customer Support",
    html,
  });
}
