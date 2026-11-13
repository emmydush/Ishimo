import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Users, Star, Briefcase, Lock, Mail, MapPin } from 'lucide-react';

const Section = ({ icon: Icon, title, children }) => (
  <div style={{ marginBottom: '28px' }}>
    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '10px', color: 'var(--text-main)' }}>
      <Icon size={18} color="var(--accent-gold)" /> {title}
    </h3>
    <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.7 }}>{children}</div>
  </div>
);

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '40px 16px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '40%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(10, 10, 11, 0) 70%)', zIndex: 0 }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '820px', padding: '40px', zIndex: 1 }}
      >
        <div style={{ marginBottom: '28px' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={16} /> Back
          </motion.button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="flex-center" style={{ width: '56px', height: '56px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '16px', margin: '0 auto 16px', color: 'var(--accent-gold)' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Terms and Conditions</h2>
          <p style={{ color: 'var(--text-muted)' }}>Effective date: November 13, 2026</p>
        </div>

        <Section icon={ShieldCheck} title="1. Acceptance of Terms">
          By registering an account on Ishimo ("the Platform") as a Worker or an Employer, you agree to be bound by these Terms and Conditions and by our Privacy Policy. If you do not accept these Terms, you must not create an account or use the Platform.
        </Section>

        <Section icon={Users} title="2. Definitions">
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li><strong>Platform</strong> — Ishimo, the marketplace connecting household workers with employers in Rwanda.</li>
            <li><strong>Worker</strong> — a person registered to offer household services (nanny, cook, cleaner, gardener, security, etc.).</li>
            <li><strong>Employer</strong> — a person or household registered to find and engage Workers.</li>
            <li><strong>Engagement</strong> — any work agreement made between a Worker and an Employer through the Platform.</li>
          </ul>
        </Section>

        <Section icon={Users} title="3. Eligibility and Registration">
          You must be at least 18 years old and legally capable of entering into a binding agreement. You must provide accurate, complete and truthful information during registration and keep it up to date. You may register only one account per role. The Platform may require you to verify your identity using a national ID or passport issued by the Republic of Rwanda.
        </Section>

        <Section icon={Lock} title="4. Account Security">
          You are responsible for safeguarding your login credentials. You must notify the Platform immediately of any unauthorized use of your account. You are responsible for all activity that occurs under your account.
        </Section>

        <Section icon={Briefcase} title="5. Worker Obligations">
          Workers must: provide truthful information about their skills, experience, documents and availability; perform engagements with reasonable care, skill and professionalism; respect the Employer's household, privacy and property; and not misrepresent their identity, qualifications or references.
        </Section>

        <Section icon={Briefcase} title="6. Employer Obligations">
          Employers must: post truthful and accurate job requests; provide safe and reasonable working conditions; treat Workers with dignity and respect; and honour agreed payment terms for engagements made through the Platform.
        </Section>

        <Section icon={Star} title="7. Platform Role, Payments and Fees">
          The Platform is a marketplace that connects Workers and Employers. The Platform is not a party to any Engagement and does not employ Workers. Payment terms, rates and schedules are agreed directly between the parties. The Platform may charge service fees where indicated; any fees in effect are disclosed before an Engagement is confirmed.
        </Section>

        <Section icon={ShieldCheck} title="8. Verification and Identity Documents">
          Where required, Workers and Employers must submit genuine identification documents (national ID, passport or other accepted documents) for verification. Submitting forged, altered or another person's documents is strictly prohibited and will lead to permanent suspension and reporting to the relevant authorities.
        </Section>

        <Section icon={Star} title="9. Ratings and Reviews">
          Parties may rate and review each other after an Engagement. Reviews must be honest, fair and based on first-hand experience. The Platform may remove reviews that are abusive, fraudulent or violate these Terms.
        </Section>

        <Section icon={ShieldCheck} title="10. Prohibited Conduct">
          The following are prohibited: providing false information or documents; harassment, discrimination, abuse or threatening behaviour; illegal activities in connection with the Platform; attempting to bypass the Platform to avoid applicable fees; and any conduct that harms the safety, reputation or operation of the Platform or its users.
        </Section>

        <Section icon={Lock} title="11. Privacy and Data Protection">
          We collect and process your personal data to operate the Platform, verify identities and facilitate Engagements. Personal data is handled in accordance with Law No. 058/2021 of 13/10/2021 relating to the protection of personal data and privacy in Rwanda, and with our Privacy Policy.
        </Section>

        <Section icon={ShieldCheck} title="12. Suspension and Termination">
          The Platform may suspend or terminate an account that violates these Terms, submits false information, or engages in prohibited conduct. You may close your account at any time by contacting us. Termination does not relieve either party of obligations arising from a concluded Engagement.
        </Section>

        <Section icon={ShieldCheck} title="13. Disclaimer of Warranties">
          The Platform is provided "as is" and "as available". While we verify information where possible, we do not guarantee the accuracy of user profiles, the quality of services, or the conduct of any user. Users are encouraged to exercise their own judgment before entering an Engagement.
        </Section>

        <Section icon={ShieldCheck} title="14. Limitation of Liability">
          To the maximum extent permitted by law, the Platform is not liable for indirect, incidental or consequential damages, or for disputes, losses or injuries arising from an Engagement between a Worker and an Employer, except where caused by the Platform's gross negligence or wilful misconduct.
        </Section>

        <Section icon={Users} title="15. Dispute Resolution and Governing Law">
          These Terms are governed by the laws of the Republic of Rwanda. Parties are encouraged to resolve disputes amicably through the Platform's support channels. Any dispute that cannot be resolved amicably shall be submitted to the competent courts of the Republic of Rwanda.
        </Section>

        <Section icon={Users} title="16. Amendments">
          The Platform may update these Terms from time to time. Material changes will be communicated through the Platform. Continued use of the Platform after changes take effect constitutes acceptance of the updated Terms.
        </Section>

        <Section icon={Mail} title="17. Contact">
          Questions about these Terms may be sent to <span style={{ color: 'var(--accent-gold)' }}>contact@ishimo.com</span>{' '}
          <MapPin size={12} style={{ verticalAlign: 'middle' }} /> Kigali, Rwanda.
        </Section>

        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-premium"
            style={{ fontSize: '1rem', padding: '14px 36px' }}
            onClick={() => navigate(-1)}
          >
            I Understand
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Terms;
