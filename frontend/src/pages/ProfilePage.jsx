import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../api";
import { mediaUrl } from "../utils";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, fetchMe, logout } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      fetchMe();
    } else {
      setUsername(user.username || "");
      setDisplayName(user.display_name || "");
      setBio(user.bio || "");
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch("/users/me", {
        username: username || null,
        display_name: displayName || null,
        bio: bio || null,
      });
      await fetchMe();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchMe();
      toast.success("Avatar updated");
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="h-screen flex items-center justify-center bg-tg-dark">
      <div className="w-full max-w-md bg-tg-sidebar p-8 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")} className="text-tg-blue hover:underline text-sm">
            ← Back to chats
          </button>
          <button onClick={handleLogout} className="text-red-400 hover:underline text-sm">
            Logout
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <label className="cursor-pointer group relative">
            {user.avatar_url ? (
              <img
                src={mediaUrl(user.avatar_url)}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover group-hover:brightness-75 transition"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-tg-blue flex items-center justify-center text-3xl font-bold group-hover:brightness-75 transition">
                {(user.display_name || user.phone)[0].toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-sm">
              📷
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
          <p className="mt-2 text-tg-muted text-xs">Click to change avatar</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs text-tg-muted mb-1 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-3 bg-tg-input rounded-lg text-tg-text outline-none focus:ring-2 focus:ring-tg-blue"
            />
          </div>
          <div>
            <label className="text-xs text-tg-muted mb-1 block">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 bg-tg-input rounded-lg text-tg-text outline-none focus:ring-2 focus:ring-tg-blue"
            />
          </div>
          <div>
            <label className="text-xs text-tg-muted mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-tg-input rounded-lg text-tg-text outline-none focus:ring-2 focus:ring-tg-blue resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-tg-blue rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-tg-muted">
          Phone: {user.phone}
        </div>
      </div>
    </div>
  );
}
