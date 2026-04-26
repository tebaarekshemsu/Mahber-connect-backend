export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-card p-6">
          <h3 className="text-text-secondary font-medium">Active Mahbers</h3>
          <p className="text-3xl font-bold text-gold mt-2">3</p>
        </div>
        
        <div className="glass rounded-card p-6">
          <h3 className="text-text-secondary font-medium">Total Balance</h3>
          <p className="text-3xl font-bold text-gold mt-2">12,500 ETB</p>
        </div>
        
        <div className="glass rounded-card p-6">
          <h3 className="text-text-secondary font-medium">Pending Payments</h3>
          <p className="text-3xl font-bold text-status-warning mt-2">1</p>
        </div>
      </div>
      
      <div className="glass rounded-card p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="py-3 border-b border-border-glass last:border-0 flex justify-between items-center">
            <div>
              <p className="font-medium">Monthly Contribution</p>
              <p className="text-sm text-text-secondary">Addis Iddir</p>
            </div>
            <span className="text-status-success font-medium">+500 ETB</span>
          </div>
          <div className="py-3 border-b border-border-glass last:border-0 flex justify-between items-center">
            <div>
              <p className="font-medium">Meeting Attendance</p>
              <p className="text-sm text-text-secondary">Tech Equb</p>
            </div>
            <span className="text-text-secondary text-sm">Yesterday</span>
          </div>
        </div>
      </div>
    </div>
  );
}
