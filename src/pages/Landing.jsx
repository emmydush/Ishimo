import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, Star, LogIn, Check, Crown, Briefcase } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: '80px 16px 40px' }}>

      {/* Top nav */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', zIndex: 2 }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', padding: '8px 20px' }}
          onClick={() => navigate('/login')}
        >
          <LogIn size={18} />
          Log In
        </motion.button>
      </div>

      {/* Background elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(10, 10, 11, 0) 70%)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(10, 10, 11, 0) 70%)', zIndex: 0 }} />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ zIndex: 1, textAlign: 'center', maxWidth: '800px', width: '100%', marginBottom: '48px' }}
      >
        <h1 className="responsive-hero-title">
          The World's Elite <br />
          <span className="text-gradient-gold">Household Network</span>
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', marginBottom: '40px', lineHeight: 1.6 }}>
          Connect with top-tier nannies, cooks, cleaners, and security professionals. 
          Experience a new standard of trust and excellence in your home.
        </p>

        <div className="responsive-button-group">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-premium"
            style={{ fontSize: '1.05rem', padding: '16px 36px' }}
            onClick={() => navigate('/register-employer')}
          >
            I am an Employer
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-outline"
            style={{ fontSize: '1.05rem', padding: '16px 36px' }}
            onClick={() => navigate('/register-worker')}
          >
            I am a Worker
          </motion.button>
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="responsive-grid-3"
        style={{ maxWidth: '1000px', width: '100%', zIndex: 1, marginBottom: '80px' }}
      >
        {[
          { icon: <ShieldCheck size={32} color="var(--accent-emerald)" />, title: 'Fully Vetted', desc: 'Every professional undergoes rigorous background and identity checks.' },
          { icon: <Star size={32} color="var(--accent-gold)" />, title: 'Elite Talent', desc: 'Only highly experienced candidates with proven track records.' },
          { icon: <Users size={32} color="#fff" />, title: 'Direct Connection', desc: 'Seamlessly communicate and hire directly through our secure platform.' }
        ].map((feature, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>{feature.icon}</div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{feature.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{feature.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Pricing Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        style={{ zIndex: 1, maxWidth: '1200px', width: '100%', textAlign: 'center' }}
      >
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '12px' }}>Choose Your Plan</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '48px' }}>
          Flexible pricing for employers and workers
        </p>

        <div className="responsive-grid-3" style={{ gap: '24px' }}>
          {/* Basic Plan */}
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'left', position: 'relative' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Basic</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Free
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
              {[
                'Browse worker profiles',
                'Post up to 3 jobs per month',
                'Basic search filters',
                'Email support'
              ].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  <Check size={18} color="var(--accent-emerald)" />
                  {item}
                </li>
              ))}
            </ul>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-outline"
              style={{ width: '100%', padding: '14px' }}
              onClick={() => navigate('/register-employer')}
            >
              Get Started
            </motion.button>
          </div>

          {/* Premium Plan */}
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'left', position: 'relative', border: '2px solid var(--accent-gold)', transform: 'scale(1.05)' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gold)', color: '#000', padding: '4px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
              MOST POPULAR
            </div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={16} /> Premium
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                $49<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/month</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
              {[
                'Everything in Basic',
                'Unlimited job postings',
                'Advanced search & filters',
                'Priority support',
                'Worker verification access',
                'Analytics dashboard'
              ].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  <Check size={18} color="var(--accent-gold)" />
                  {item}
                </li>
              ))}
            </ul>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-premium"
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, var(--accent-gold) 0%, #b8860b 100%)', color: '#000' }}
              onClick={() => navigate('/register-employer')}
            >
              Start Free Trial
            </motion.button>
          </div>

          {/* Enterprise Plan */}
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'left', position: 'relative' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Enterprise</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                $199<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/month</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
              {[
                'Everything in Premium',
                'Dedicated account manager',
                'Custom integrations',
                'Bulk hiring tools',
                'API access',
                'SLA guarantee'
              ].map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  <Check size={18} color="var(--accent-emerald)" />
                  {item}
                </li>
              ))}
            </ul>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-outline"
              style={{ width: '100%', padding: '14px' }}
              onClick={() => navigate('/register-employer')}
            >
              Contact Sales
            </motion.button>
          </div>
        </div>

        {/* Worker Pricing */}
        <div style={{ marginTop: '64px', padding: '32px', background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <Briefcase size={24} color="var(--accent-emerald)" /> Worker Plans
          </h3>
          <div className="responsive-grid-2" style={{ gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'left' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Free Profile</div>
              <div style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Create your profile and get discovered</div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '24px' }}>
                {[
                  'Professional profile',
                  'Job applications',
                  'Direct messaging',
                  'Basic analytics'
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <Check size={16} color="var(--accent-emerald)" />
                    {item}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-outline"
                style={{ width: '100%', padding: '12px' }}
                onClick={() => navigate('/register-worker')}
              >
                Create Profile
              </motion.button>
            </div>
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'left', border: '2px solid var(--accent-emerald)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent-emerald)' }}>Pro Worker - $19/mo</div>
              <div style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Boost your visibility and get more jobs</div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '24px' }}>
                {[
                  'Featured in search results',
                  'Priority job matching',
                  'Verified badge',
                  'Advanced analytics',
                  'Priority support'
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <Check size={16} color="var(--accent-emerald)" />
                    {item}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-premium"
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #047857 100%)', color: '#fff' }}
                onClick={() => navigate('/register-worker')}
              >
                Upgrade to Pro
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
};

export default Landing;
