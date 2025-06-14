
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Hr,
  Section,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface SignupVerificationEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  user_email: string
}

export const SignupVerificationEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  user_email,
}: SignupVerificationEmailProps) => (
  <Html>
    <Head />
    <Preview>Verify your email address for Splitify!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>Welcome to Splitify!</Heading>
          <Text style={tagline}>Credit Ease Divide</Text>
        </Section>
        
        <Section style={content}>
          <Text style={text}>
            Thank you for signing up! Please verify your email address to complete your registration and start splitting bills with ease.
          </Text>
          
          <Section style={buttonContainer}>
            <Link
              href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
              style={button}
            >
              Verify Email Address
            </Link>
          </Section>
          
          <Text style={text}>
            Or copy and paste this verification code in the app:
          </Text>
          <Section style={codeContainer}>
            <Text style={code}>{token}</Text>
          </Section>
          
          <Hr style={hr} />
          
          <Text style={footerText}>
            If you didn't create an account with Splitify!, you can safely ignore this email.
          </Text>
          
          <Text style={footerText}>
            This verification link will expire in 24 hours for security reasons.
          </Text>
        </Section>
        
        <Section style={footer}>
          <Text style={footerBrand}>
            Splitify! - Split bills seamlessly with your friends and family
          </Text>
          <Text style={footerTagline}>
            Credit Ease Divide
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupVerificationEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '32px 40px',
  textAlign: 'center' as const,
  background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
  borderRadius: '8px 8px 0 0',
}

const content = {
  padding: '40px',
}

const h1 = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
}

const tagline = {
  color: '#e2e8f0',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  lineHeight: '50px',
  textAlign: 'center' as const,
  textDecoration: 'none',
  width: '200px',
  padding: '0 20px',
}

const codeContainer = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '24px 0',
}

const code = {
  color: '#1e293b',
  fontSize: '20px',
  fontWeight: 'bold',
  letterSpacing: '4px',
  margin: '0',
  fontFamily: 'monospace',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
}

const footerText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
}

const footer = {
  borderTop: '1px solid #e2e8f0',
  padding: '32px 40px 0',
  textAlign: 'center' as const,
}

const footerBrand = {
  color: '#64748b',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
}

const footerTagline = {
  color: '#94a3b8',
  fontSize: '12px',
  fontWeight: '500',
  margin: '0',
}
