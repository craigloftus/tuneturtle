import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Cloud, WifiOff, Heart, Shield, ChevronDown, Github, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: Cloud,
    title: "S3 Streaming",
    desc: "Connect to any AWS S3 bucket and stream your entire music library. Full quality audio, no compression, no file size limits.",
  },
  {
    icon: WifiOff,
    title: "Works Offline",
    desc: "Download tracks to your device for offline playback. Your music goes wherever you go — no internet required.",
  },
  {
    icon: Heart,
    title: "Free Forever",
    desc: "No accounts, no subscriptions, no ads, no data collection. TuneTurtle is completely free, and always will be.",
  },
  {
    icon: Shield,
    title: "Your Storage",
    desc: "Your files stay in your S3 bucket. TuneTurtle never stores, copies, or processes your data on any server.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Connect your bucket",
    desc: "Enter your AWS S3 credentials. TuneTurtle connects directly — no middleware, no third-party servers.",
  },
  {
    num: "02",
    title: "Index your library",
    desc: "TuneTurtle scans your bucket and organises everything by album, artist, and track. Album art is pulled automatically.",
  },
  {
    num: "03",
    title: "Press play",
    desc: "That's it. Stream directly or download tracks for offline listening. Your music, your way.",
  },
];

function BackgroundTurtle({
  className,
  path,
  duration,
  imageSize,
  opacity,
  headingOffset,
  mirrored = false,
}: {
  className?: string;
  path: string;
  duration: string;
  imageSize: number;
  opacity: number;
  headingOffset: number;
  mirrored?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <g opacity={opacity}>
        <g>
          <animateMotion
            dur={duration}
            repeatCount="indefinite"
            calcMode="linear"
            rotate="auto"
            path={path}
          />
          <g transform={`rotate(${headingOffset})`}>
            <g transform={mirrored ? "scale(-1 1)" : undefined}>
              <image
                href="/static/base_turtle.avif"
                x={-imageSize / 2}
                y={-imageSize / 2}
                width={imageSize}
                height={imageSize}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export function Marketing() {
  const [, navigate] = useLocation();

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* ═══════════════════════════════════════════════
          HERO — matches splash screen for seamless transition
          ═══════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen overflow-hidden"
        style={{ background: "linear-gradient(to bottom right, #059669, #0d9488)" }}
      >
        {/* Decorative background turtles */}
        <BackgroundTurtle
          className="absolute inset-0 h-full w-full pointer-events-none select-none overflow-visible"
          path="M 66 22 a 16 10 0 1 1 32 0 a 16 10 0 1 1 -32 0"
          duration="34s"
          imageSize={18}
          opacity={0.07}
          headingOffset={45}
        />
        <BackgroundTurtle
          className="absolute inset-0 h-full w-full pointer-events-none select-none overflow-visible"
          path="M 2 80 a 18 12 0 1 0 36 0 a 18 12 0 1 0 -36 0"
          duration="30s"
          imageSize={13}
          opacity={0.05}
          headingOffset={135}
          mirrored
        />
        <BackgroundTurtle
          className="absolute inset-0 hidden h-full w-full pointer-events-none select-none overflow-visible lg:block"
          path="M 7 40 a 13 8 0 1 1 26 0 a 13 8 0 1 1 -26 0"
          duration="24s"
          imageSize={8}
          opacity={0.04}
          headingOffset={45}
        />

        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="brand-lockup relative z-10" style={{ transform: "translateY(-1.5rem)" }}>
            <img
              src="/static/base_turtle.avif"
              alt="TuneTurtle"
              width={250}
              height={250}
              className="brand-logo"
              style={{ animation: "float-gentle 4s ease-in-out 0.8s infinite" }}
            />
            <h1 className="brand-title">
              <span>Tune</span>
              <span>Turtle</span>
            </h1>
          </div>
        </div>

        <div
          className="absolute left-1/2 z-10 flex w-full max-w-md -translate-x-1/2 flex-col items-center px-6 text-center"
          style={{ top: "calc(50% + 7.75rem)" }}
        >
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="text-lg leading-relaxed md:text-xl mt-4"
            style={{ color: "rgba(255, 255, 255, 0.8)" }}
          >
            Stream your music directly from AWS S3.<br />
            No accounts. No fees. Just dive in.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            onClick={() => navigate("/setup")}
            className="mt-8 inline-flex items-center gap-2 rounded-xl border-0 px-8 py-3.5 text-base font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
            style={{
              backgroundColor: "#fff",
              color: "#059669",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            }}
          >
            Setup
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5"
          style={{ bottom: "4.5rem", color: "rgba(255, 255, 255, 0.45)" }}
        >
          <span className="text-xs tracking-widest uppercase">Learn more</span>
          <ChevronDown
            className="w-4 h-4"
            style={{ animation: "bounce-subtle 2s ease-in-out infinite" }}
          />
        </motion.div>

        {/* Wave transition to light bg */}
        <svg
          viewBox="0 0 1440 90"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full pointer-events-none"
          style={{ height: "70px" }}
        >
          <path
            d="M0,35 C320,75 680,10 1080,50 C1280,65 1400,45 1440,40 L1440,90 L0,90 Z"
            fill="hsl(150, 20%, 97%)"
          />
        </svg>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURES
          ═══════════════════════════════════════════════ */}
      <section
        className="relative px-6 py-20 md:py-28 overflow-hidden"
        style={{ backgroundColor: "hsl(150, 20%, 97%)" }}
      >
        {/* Large decorative watermark turtle */}
        <BackgroundTurtle
          className="absolute inset-0 h-full w-full pointer-events-none select-none overflow-visible"
          path="M 48 28 a 30 19 0 1 1 60 0 a 30 19 0 1 1 -60 0"
          duration="46s"
          imageSize={44}
          opacity={0.025}
          headingOffset={45}
        />

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{ color: "hsl(160, 40%, 12%)" }}
            >
              Everything you need
            </h2>
            <p className="mt-3 text-base max-w-md mx-auto" style={{ color: "hsl(160, 15%, 45%)" }}>
              A music player built around simplicity and your privacy.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className="rounded-xl border p-6 transition-shadow hover:shadow-md"
                style={{
                  backgroundColor: "#fff",
                  borderColor: "hsl(150, 15%, 90%)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: "hsl(166, 72%, 35%)", color: "#fff" }}
                >
                  <feat.icon className="w-5 h-5" />
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "hsl(160, 40%, 12%)" }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(160, 15%, 45%)" }}>
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════════════ */}
      <section
        className="px-6 py-20 md:py-28"
        style={{ backgroundColor: "hsl(150, 18%, 95%)" }}
      >
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{ color: "hsl(160, 40%, 12%)" }}
            >
              Up and running in minutes
            </h2>
          </motion.div>

          <div className="space-y-0">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.1, duration: 0.45 }}
                className="flex gap-5 md:gap-8 items-start relative"
              >
                {/* Vertical connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="absolute left-[19px] md:left-[23px] top-12 bottom-0 w-px"
                    style={{ backgroundColor: "hsl(150, 15%, 85%)" }}
                  />
                )}

                {/* Step number */}
                <div
                  className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold relative z-10"
                  style={{
                    backgroundColor: i === 0 ? "hsl(166, 72%, 35%)" : "#fff",
                    color: i === 0 ? "#fff" : "hsl(166, 72%, 35%)",
                    border: i === 0 ? "none" : "2px solid hsl(150, 15%, 85%)",
                  }}
                >
                  {step.num}
                </div>

                {/* Step content */}
                <div className="pb-10 md:pb-12">
                  <h3
                    className="text-base md:text-lg font-semibold mb-1"
                    style={{ color: "hsl(160, 40%, 12%)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(160, 15%, 45%)" }}>
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Turtle "finish line" decoration */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mt-4"
          >
            <img
              src="/static/base_turtle.avif"
              alt=""
              aria-hidden="true"
              width={48}
              height={48}
              style={{ opacity: 0.15 }}
            />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          OPEN SOURCE
          ═══════════════════════════════════════════════ */}
      <section
        className="relative px-6 py-20 md:py-28 overflow-hidden"
        style={{ backgroundColor: "hsl(150, 20%, 97%)" }}
      >
        {/* Decorative background turtle */}
        <BackgroundTurtle
          className="absolute inset-0 h-full w-full pointer-events-none select-none overflow-visible"
          path="M -8 92 a 24 16 0 1 1 48 0 a 24 16 0 1 1 -48 0"
          duration="38s"
          imageSize={28}
          opacity={0.03}
          headingOffset={135}
          mirrored
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center relative z-10"
        >
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
            style={{ color: "hsl(160, 40%, 12%)" }}
          >
            Free &amp; Open Source
          </h2>
          <p
            className="text-base leading-relaxed mb-8 max-w-lg mx-auto"
            style={{ color: "hsl(160, 15%, 45%)" }}
          >
            TuneTurtle is fully open source. No hidden costs, no premium tiers,
            no data harvesting. View the code, report bugs, or contribute — everyone
            is welcome.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/craigloftus/tuneturtle"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                backgroundColor: "hsl(160, 40%, 12%)",
                color: "#fff",
              }}
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>

            <button
              onClick={() => navigate("/setup")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer border-0 transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{
                backgroundColor: "hsl(166, 72%, 35%)",
                color: "#fff",
              }}
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════ */}
      <footer
        className="px-6 py-8 border-t"
        style={{
          backgroundColor: "hsl(150, 20%, 97%)",
          borderColor: "hsl(150, 15%, 90%)",
        }}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/static/base_turtle.avif"
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
            />
            <span className="text-sm font-semibold" style={{ color: "hsl(160, 40%, 12%)" }}>
              TuneTurtle
            </span>
          </div>

          <div
            className="flex items-center gap-4 text-xs"
            style={{ color: "hsl(160, 15%, 45%)" }}
          >
            <span>Free &amp; Open Source</span>
            <span>&middot;</span>
            <a
              href="https://github.com/craigloftus/tuneturtle"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:no-underline"
              style={{ color: "hsl(166, 72%, 35%)" }}
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
