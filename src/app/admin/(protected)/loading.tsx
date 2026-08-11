export default function AdminLoading() {
  return (
    <section
      className="admin-dashboard"
      aria-busy="true"
      aria-label="Loading administration"
    >
      <div className="admin-loading-bar" />
      <div className="admin-loading-grid">
        {[1, 2, 3, 4].map((item) => (
          <span key={item} />
        ))}
      </div>
    </section>
  );
}
