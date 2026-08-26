import { Suspense } from "react";
import AuthView from "@/components/store/views/auth-view";

export const metadata = { title: "تسجيل الدخول" };

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthView />
    </Suspense>
  );
}
