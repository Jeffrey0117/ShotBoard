import { useThemeStore } from '../../stores/themeStore';
import './styles.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${theme}`} />
      </span>
      <span className="theme-toggle-icons">
        <span className={`theme-icon sun ${theme === 'light' ? 'active' : ''}`}>
          ☀
        </span>
        <span className={`theme-icon moon ${theme === 'dark' ? 'active' : ''}`}>
          ☽
        </span>
      </span>
    </button>
  );
}
