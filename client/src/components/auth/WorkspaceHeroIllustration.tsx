/** Illustration only — bg matches left panel (#b8a5fe) so no visible box */
export function WorkspaceHeroIllustration() {
  return (
    <div
      className="relative mx-auto w-full max-w-[380px] sm:max-w-[400px]"
      style={{ backgroundColor: '#b8a5fe' }}
      aria-hidden
    >
      <img
        src="/images/auth/workspace-hero.png"
        alt=""
        className="block h-auto w-full select-none"
        draggable={false}
      />
    </div>
  )
}
