import { Home, Search, Library, User, LogIn } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginPrompt } from '@/hooks/useLoginPrompt';

export function BottomNav() {
  const { user, profile } = useAuth();
  const { checkAuth } = useLoginPrompt();

  const navItems = [
    { icon: Home, label: 'Home', to: '/' },
    { icon: Search, label: 'Discover', to: '/discover' },
    { icon: Library, label: 'Library', to: '/library', requiresAuth: true },
    user
      ? { icon: User, label: 'Profile', to: '/profile', requiresAuth: true }
      : { icon: LogIn, label: 'Login', to: '/auth' },
  ];

  return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-effect border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ icon: Icon, label, to, requiresAuth }) => (
            <NavLink
              key={to}
              to={to}
              onClick={(e) => {
                if (requiresAuth && !user) {
                  e.preventDefault();
                  checkAuth(`access ${label.toLowerCase()}`);
                }
              }}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      'relative',
                      isActive &&
                        'after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
  );
}
