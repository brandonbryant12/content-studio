import { createFileRoute, Link } from '@tanstack/react-router';
import RegisterCredentialsForm from '@/routes/_public/-components/register-form';

export const Route = createFileRoute('/_public/register')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <p className="page-eyebrow">Get started</p>
          <h1 className="page-title">Create account</h1>
        </div>
        <div className="card-padded">
          <RegisterCredentialsForm />
        </div>
        <p className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="text-link-primary">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
