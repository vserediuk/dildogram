import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [smsMode, setSmsMode] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, requestSMS, verifySMS } = useAuthStore();
  const navigate = useNavigate();

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(phone, password);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async () => {
    setLoading(true);
    try {
      const res = await requestSMS(phone);
      setCodeSent(true);
      toast.success(`Code sent! (dev: ${res.code_for_dev})`);
    } catch (err) {
      toast.error("Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifySMS(phone, code);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-tg-dark">
      <div className="w-full max-w-sm bg-tg-sidebar p-8 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-2">Messenger</h1>
        <p className="text-tg-muted text-center text-sm mb-6">Sign in to continue</p>

        {/* Toggle */}
        <div className="flex mb-6 bg-tg-input rounded-lg overflow-hidden">
          <button
            onClick={() => setSmsMode(false)}
            className={`flex-1 py-2 text-sm font-medium transition ${
              !smsMode ? "bg-tg-blue text-white" : "text-tg-muted"
            }`}
          >
            Password
          </button>
          <button
            onClick={() => setSmsMode(true)}
            className={`flex-1 py-2 text-sm font-medium transition ${
              smsMode ? "bg-tg-blue text-white" : "text-tg-muted"
            }`}
          >
            SMS Code
          </button>
        </div>

        {!smsMode ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
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
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-tg-input rounded-lg text-tg-text outline-none focus:ring-2 focus:ring-tg-blue"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-tg-blue rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-tg-input rounded-lg text-tg-text outline-none focus:ring-2 focus:ring-tg-blue"
            />
            {!codeSent ? (
              <button
                onClick={handleRequestCode}
                disabled={loading || !phone}
                className="w-full py-3 bg-tg-blue rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Code"}
              </button>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="w-full px-4 py-3 bg-tg-input rounded-lg text-tg-text outline-none focus:ring-2 focus:ring-tg-blue text-center text-xl tracking-widest"
                />
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 bg-tg-blue rounded-lg font-semibold hover:brightness-110 transition disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-tg-muted">
          Don't have an account?{" "}
          <Link to="/register" className="text-tg-blue hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
