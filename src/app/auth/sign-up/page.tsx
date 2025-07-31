import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Join Us
          </h1>
          <p className="text-gray-600">Create your account to get started</p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
