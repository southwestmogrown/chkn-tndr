import { LogOut, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

export function Header() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    clearAuth();
    navigate("/");
  }

  return (
    <header className="flex items-center justify-between px-5 py-4">
      <button
        onClick={() => navigate("/home")}
        className="font-display font-black text-2xl tracking-tight text-white hover:text-brand-400 transition-colors"
      >
        🍗 Chikn Tndr
      </button>

      {user && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/home")}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="My groups"
          >
            <Users size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold">
            {user.displayName[0].toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-no transition-colors"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </header>
  );
}
