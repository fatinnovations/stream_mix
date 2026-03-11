import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { MiniPlayer } from './MiniPlayer';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background pb-32">
      <main className="container max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        <Outlet />
      </main>
      <MiniPlayer />
      <BottomNav />
    </div>
  );
}
