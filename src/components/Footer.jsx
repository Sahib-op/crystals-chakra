import { Link } from 'react-router-dom';
import { BRAND_NAME } from '../constants';
export default function Footer() {
  return (
    <footer className="royal-footer">
      <span>
        © {new Date().getFullYear()} {BRAND_NAME}
      </span>
      <Link to="/#privacy">Privacy & care</Link>
      <Link to="/studio">Studio sign-in</Link>
    </footer>
  );
}
