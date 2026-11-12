import { Link } from 'react-router-dom';
import { BRAND_NAME } from '../constants';
export default function Footer() {
  return (
    <footer className="royal-footer">
      <span>
        © {new Date().getFullYear()} {BRAND_NAME}
      </span>
      <nav aria-label="Policies" className="royal-footer-links">
        <Link to="/policies">Policies</Link>
        <Link to="/policies#privacy">Privacy</Link>
        <Link to="/policies#returns">Shipping & returns</Link>
        <Link to="/policies#grievance">Complaints</Link>
      </nav>
      <Link to="/studio">Studio sign-in</Link>
    </footer>
  );
}
