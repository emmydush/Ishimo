import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Users, Star, Briefcase, Lock, Mail, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();

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
            <ArrowLeft size={16} /> {t('back')}
          </motion.button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="flex-center" style={{ width: '56px', height: '56px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '16px', margin: '0 auto 16px', color: 'var(--accent-gold)' }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>{t('terms_and_conditions')}</h2>
          <p style={{ color: 'var(--text-muted)' }}>{t('effective_date')}</p>
        </div>

        <Section icon={ShieldCheck} title={t('terms_s1_title')}>
          {t('terms_s1_body')}
        </Section>

        <Section icon={Users} title={t('terms_s2_title')}>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li><strong>{t('platform')}</strong> — {t('terms_s2_def_platform')}</li>
            <li><strong>{t('worker')}</strong> — {t('terms_s2_def_worker')}</li>
            <li><strong>{t('employer')}</strong> — {t('terms_s2_def_employer')}</li>
            <li><strong>{t('engagement')}</strong> — {t('terms_s2_def_engagement')}</li>
          </ul>
        </Section>

        <Section icon={Users} title={t('terms_s3_title')}>
          {t('terms_s3_body')}
        </Section>

        <Section icon={Lock} title={t('terms_s4_title')}>
          {t('terms_s4_body')}
        </Section>

        <Section icon={Briefcase} title={t('terms_s5_title')}>
          {t('terms_s5_body')}
        </Section>

        <Section icon={Briefcase} title={t('terms_s6_title')}>
          {t('terms_s6_body')}
        </Section>

        <Section icon={Star} title={t('terms_s7_title')}>
          {t('terms_s7_body')}
        </Section>

        <Section icon={ShieldCheck} title={t('terms_s8_title')}>
          {t('terms_s8_body')}
        </Section>

        <Section icon={Star} title={t('terms_s9_title')}>
          {t('terms_s9_body')}
        </Section>

        <Section icon={ShieldCheck} title={t('terms_s10_title')}>
          {t('terms_s10_body')}
        </Section>

        <Section icon={Lock} title={t('terms_s11_title')}>
          {t('terms_s11_body')}
        </Section>

        <Section icon={ShieldCheck} title={t('terms_s12_title')}>
          {t('terms_s12_body')}
        </Section>

        <Section icon={ShieldCheck} title={t('terms_s13_title')}>
          {t('terms_s13_body')}
        </Section>

        <Section icon={ShieldCheck} title={t('terms_s14_title')}>
          {t('terms_s14_body')}
        </Section>

        <Section icon={Users} title={t('terms_s15_title')}>
          {t('terms_s15_body')}
        </Section>

        <Section icon={Users} title={t('terms_s16_title')}>
          {t('terms_s16_body')}
        </Section>

        <Section icon={Mail} title={t('terms_s17_title')}>
          {t('terms_s17_body')} <span style={{ color: 'var(--accent-gold)' }}>contact@ishimo.com</span>{' '}
          <MapPin size={12} style={{ verticalAlign: 'middle' }} /> {t('kigali_rwanda')}
        </Section>

        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-premium"
            style={{ fontSize: '1rem', padding: '14px 36px' }}
            onClick={() => navigate(-1)}
          >
            {t('i_understand')}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Terms;
