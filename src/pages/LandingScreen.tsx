interface Props {
  onEnter: () => void;
}

export function LandingScreen({ onEnter }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Badge */}
        <span className="inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-medium tracking-wide">
          Multimodal Hackathon · June 6, 2026
        </span>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Design Interview Agent
          </h1>
          <p className="text-gray-500 text-base leading-relaxed">
            AI-powered mock interviews for product designers. Paste a job description,
            get a personalized strategy, and practice with a live AI interviewer.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onEnter}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
          Launch app
        </button>
      </div>
    </div>
  );
}
