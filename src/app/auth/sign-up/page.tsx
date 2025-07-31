import { SignUpForm } from "../../../components/sign-up-form";

// Force this page to be rendered on the server for each request
// This prevents SSR issues with browser APIs
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Create Account
          </h1>
          <p className="text-gray-600">Enter your details to create an account</p>
        </div>
        <SignUpForm />
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/auth/login" className="text-purple-600 hover:text-purple-700 font-medium">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
