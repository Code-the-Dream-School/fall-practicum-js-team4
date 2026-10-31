import { Link } from 'react-router';

import { Icon } from '../components/Icon';
import { SignupForm } from '../features/user/components/SignupForm';

import './RegisterPage.css';

export function RegisterPage() {
  return (
    <div className="register-page">
      <section className="register-page__card">
        <header className="register-page__header">
          <span className="register-page__eyebrow">
            Join the PawRadar Network
          </span>

          <div className="register-page__emblem" aria-hidden="true">
            <Icon name="radar" />
          </div>

          <h1>Create Your PawRadar Account</h1>

          <p>
            Report lost or found pets, manage your reports, and help reunite
            pets with their families.
          </p>
        </header>

        <SignupForm />

        <p className="register-page__signin">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </section>
    </div>
  );
}
