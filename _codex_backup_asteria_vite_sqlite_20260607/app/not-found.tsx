export default function NotFound() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-background text-on-background px-6">
            <div className="max-w-md text-center space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Asteria</p>
                <h1 className="text-2xl font-semibold text-primary">Page not found</h1>
                <p className="text-sm text-on-surface-variant">
                    The requested route is unavailable in this workspace.
                </p>
            </div>
        </main>
    );
}
