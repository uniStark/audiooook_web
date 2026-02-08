import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { bookApi } from '../utils/api';
import { formatTime, formatDate } from '../utils/format';

export default function BookCard({ book, progress, index = 0 }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => navigate(`/book/${book.id}`)}
      className="glass-card p-3 flex gap-3 active:scale-[0.98] transition-transform cursor-pointer"
    >
      {/* 封面 */}
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-dark-700">
        <img
          src={bookApi.getCoverUrl(book.id)}
          alt={book.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>
      
      {/* 信息 */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="font-semibold text-sm text-white truncate">{book.name}</h3>
          <p className="text-xs text-dark-400 mt-1">
            {book.seasonCount > 1 ? `${book.seasonCount}季 · ` : ''}{book.totalEpisodes}集
          </p>
        </div>
        
        {/* 播放进度 */}
        {progress && (
          <div className="mt-1">
            <p className="text-xs text-primary-500 truncate">
              {progress.seasonName && `${progress.seasonName} · `}
              {progress.episodeName || `第${progress.episodeIndex + 1}集`}
              {progress.currentTime > 0 && ` · ${formatTime(progress.currentTime)}`}
            </p>
            <p className="text-xs text-dark-500 mt-0.5">{formatDate(progress.updatedAt)}</p>
          </div>
        )}
      </div>
      
      {/* 箭头 */}
      <div className="flex items-center text-dark-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.div>
  );
}
