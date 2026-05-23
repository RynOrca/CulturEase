import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-6xl mb-4">🗺️</div>
      <h1 className="font-display text-3xl font-bold text-ink mb-3">
        404 · 页面未找到
      </h1>
      <p className="text-slate mb-6 text-center max-w-md">
        你似乎在探索一个不存在的页面。留学生活也是一样——迷路是探索的一部分。
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors"
      >
        返回首页
      </Link>
    </div>
  );
}
