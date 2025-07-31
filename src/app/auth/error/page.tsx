import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            There was an error with your authentication. Please try again.
          </p>
          <a
            href="/auth/login"
            className="inline-block w-full text-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Login
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
