import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HiOutlineBookOpen, 
  HiOutlineHeart, 
  HiOutlineCog6Tooth 
} from 'react-icons/hi2';

const navItems = [
  { path: '/', icon: HiOutlineBookOpen, label: '书架' },
  { path: '/favorites', icon: HiOutlineHeart, label: '收藏' },
  { path: '/settings', icon: HiOutlineCog6Tooth, label: '设置' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // 播放器全屏时隐藏底部导航
  if (location.pathname === '/player') return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-lg mx-auto">
        <nav className="bg-dark-900/95 backdrop-blur-xl border-t border-dark-700/50 px-6 pb-safe">
          <div className="flex justify-around items-center h-14">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center gap-1 relative py-1 px-4"
                >
                  <div className="relative">
                    <Icon className={`w-6 h-6 transition-colors duration-200 ${
                      isActive ? 'text-primary-500' : 'text-dark-400'
                    }`} />
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full"
                      />
                    )}
                  </div>
                  <span className={`text-[10px] transition-colors duration-200 ${
                    isActive ? 'text-primary-500 font-medium' : 'text-dark-500'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
