import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, Star, LogIn } from 'lucide-react';

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
        style={{ maxWidth: '1000px', width: '100%', zIndex: 1 }}
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

    </div>
  );
};

export default Landing;
