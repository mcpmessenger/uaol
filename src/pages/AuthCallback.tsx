import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiClient } from "@/lib/api/client";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get("token");
        const provider = searchParams.get("provider");
        const errorParam = searchParams.get("error");

        if (errorParam) {
          setStatus("error");
          setError(decodeURIComponent(errorParam));
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        if (token) {
          try {
            apiClient.setToken(token);
            setStatus("success");
            setTimeout(() => {
              navigate("/");
              window.location.reload();
            }, 1500);
          } catch (storeError: any) {
            setStatus("error");
            setError(`Failed to store token: ${storeError.message}`);
            setTimeout(() => navigate("/login"), 3000);
          }
        } else {
          setStatus("error");
          setError("No token received from OAuth provider. Please try logging in again.");
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (err: any) {
        setStatus("error");
        setError(`Authentication error: ${err.message || "Unknown error"}`);
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-md">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Completing authentication...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold">Authentication successful!</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-lg font-semibold text-destructive">Authentication failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
