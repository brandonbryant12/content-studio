import { createFileRoute, Link } from '@tanstack/react-router';
import LoginCredentialsForm from '@/routes/_public/-components/login-form';

export const Route = createFileRoute('/_public/login')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <p className="page-eyebrow">Content Studio</p>
          <h1 className="page-title">Sign in</h1>
        </div>
        <div className="card-padded">
          <LoginCredentialsForm />
        </div>
        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="text-link-primary">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
