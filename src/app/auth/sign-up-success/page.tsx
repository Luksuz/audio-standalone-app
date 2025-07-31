import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Success!
          </h1>
          <p className="text-gray-600">Check your email</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-green-600">
              Sign Up Successful
            </CardTitle>
            <CardDescription>
              Please check your email to confirm your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              We've sent you a confirmation email. Click the link in the email to activate your account.
            </p>
            <a
              href="/auth/login"
              className="inline-block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Login
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
