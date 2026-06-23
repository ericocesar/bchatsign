import logo from '@bchatsign/assets/logotipo2.png';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { motion } from 'framer-motion';
import { FileTextIcon, PenLineIcon, ShieldCheckIcon } from 'lucide-react';

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
} as const;

const heroItemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
} as const;

const particles = [
  { top: '12%', left: '18%', size: 6, delay: 0, duration: 6 },
  { top: '28%', right: '15%', size: 4, delay: 1.5, duration: 7 },
  { top: '55%', left: '10%', size: 8, delay: 0.8, duration: 5.5 },
  { top: '72%', right: '22%', size: 5, delay: 2.2, duration: 6.5 },
  { top: '40%', left: '60%', size: 3, delay: 3, duration: 8 },
  { top: '85%', left: '35%', size: 6, delay: 1, duration: 5 },
  { top: '18%', right: '40%', size: 4, delay: 2.5, duration: 7.5 },
  { top: '65%', left: '45%', size: 5, delay: 0.5, duration: 6.8 },
];

const floatingIcons = [
  { Icon: FileTextIcon, top: '20%', left: '25%', delay: 0, size: 'h-8 w-8' },
  { Icon: PenLineIcon, top: '60%', right: '20%', delay: 1.5, size: 'h-7 w-7' },
  { Icon: ShieldCheckIcon, top: '75%', left: '15%', delay: 3, size: 'h-9 w-9' },
];

export function BrandHero() {
  const { _ } = useLingui();

  return (
    <div className="hero-gradient relative hidden h-full w-1/2 flex-col items-center justify-center overflow-hidden p-12 lg:flex">
      {/* Dot grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/20"
          style={{
            top: p.top,
            left: p.left,
            right: p.right,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -20, 10, 0],
            rotate: [0, 5, -3, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Floating decorative icons */}
      {floatingIcons.map(({ Icon, top, left, right, delay, size }, i) => (
        <motion.div
          key={`icon-${i}`}
          className="absolute text-white/10"
          style={{ top, left, right }}
          animate={{
            y: [0, -15, 8, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 6,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Icon className={size} />
        </motion.div>
      ))}

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center"
        variants={heroVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo with glow */}
        <motion.div variants={heroItemVariants} className="mb-10">
          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-white/10 blur-2xl" />
            <img
              src={logo}
              alt="BchatSign"
              className="relative h-16 w-auto object-contain drop-shadow-lg"
            />
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={heroItemVariants}
          className="mb-4 text-3xl font-bold text-white xl:text-4xl"
        >
          <Trans>Welcome to BchatSign</Trans>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={heroItemVariants}
          className="max-w-sm text-lg text-white/70"
        >
          <Trans>Intelligent and secure digital signatures for your documents.</Trans>
        </motion.p>

        {/* Decorative line */}
        <motion.div
          variants={heroItemVariants}
          className="mt-8 h-1 w-16 rounded-full bg-white/30"
        />

        {/* Feature highlights */}
        <motion.div variants={heroItemVariants} className="mt-10 flex gap-8">
          {[
            { icon: FileTextIcon, label: _(msg`Documents`) },
            { icon: ShieldCheckIcon, label: _(msg`Secure`) },
            { icon: PenLineIcon, label: _(msg`Sign`) },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                <Icon className="h-5 w-5 text-white/80" />
              </div>
              <span className="text-xs text-white/50">{label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
