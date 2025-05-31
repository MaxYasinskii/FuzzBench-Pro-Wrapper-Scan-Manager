import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Code, Scan, Users } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">FuzzBranch Scanner</h1>
          </div>
          <Button onClick={handleLogin}>Login</Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Advanced Fuzzing Wrapper Generation Platform
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Generate intelligent fuzzing wrappers for C/C++, Ruby, and Go applications. 
            Automate security testing with AFL++, libFuzzer, and custom wrapper generators.
          </p>
          <Button size="lg" onClick={handleLogin} className="text-lg px-8 py-4">
            Start Fuzzing
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <Code className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>SAST Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Static application security testing with tools like SonarQube, Bandit, and ESLint Security.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <Scan className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>DAST Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Dynamic application security testing with OWASP ZAP, Nikto, and Burp Suite integration.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <Code className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Fuzzing Wrapper Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center">
                Automatically generate intelligent fuzzing wrappers for C/C++, Ruby, and Go using futage, Dewrapper, and custom generators.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Fuzzing API Preview */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Fuzzing Wrapper API</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center mb-6">
              Generate custom fuzzing wrappers with intelligent test case generation and comprehensive vulnerability detection.
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
              <div className="mb-2">
                <span className="text-green-400">POST</span> /api/wrappers/generate
              </div>
              <div className="mb-2">
                <span className="text-blue-400">GET</span> /api/tools
              </div>
              <div className="mb-2">
                <span className="text-yellow-400">POST</span> /api/scan
              </div>
              <div>
                <span className="text-purple-400">GET</span> /api/scans/{`{id}`}/results
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>&copy; 2024 FuzzBranch Scanner. Advanced fuzzing wrapper generation platform.</p>
      </footer>
    </div>
  );
}
