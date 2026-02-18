import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(phone, password, displayName);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-tg-dark">
      <div className="w-full max-w-sm bg-tg-sidebar p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-tg-muted text-center text-sm mb-6">Join the messenger</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-tg-input rounded-lg text-tg-text outline-none focus:ring-2 focus:ring-tg-blue"
          />
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-tg-input rounded-lg text-tg-text outline-none focus:ring-2 focus:ring-tg-blue"
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            className="w-full px-4 py-3 bg-tg-input rounded-lg text-tg-text outline-none focus:ring-2 focus:ring-tg-blue"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-tg-blue rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-tg-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-tg-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
