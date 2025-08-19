"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ToolPageHeader } from "@/components/tool-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  UserCheck, 
  Award, 
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Brain,
  Download,
  RefreshCw,
  User,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createDeterministicRng, randomInt, tagSynthetic } from '@/lib/synthetic/synthetic-utils';
import { composeToolHeaderBadges } from "@/lib/tool-badge-utils";
import { useAuth } from "@/context/AuthContext";
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useProvenance } from "@/hooks/useProvenance";

interface AuthorCredentials {
  name: string;
  bio: boolean;
  credentials: string[];
  experience: string;
  linkedinProfile: boolean;
  authorPhoto: boolean;
  contactInfo: boolean;
  expertiseAreas: string[];
}

interface TrustSignal {
  signal: string;
  status: 'present' | 'missing' | 'weak' | 'strong';
  impact: 'high' | 'medium' | 'low';
  score: number;
  recommendations: string[];
  description: string;
}

interface EATScore {
  expertise: number;
  authoritativeness: number;
  trustworthiness: number;
  overall: number;
  breakdown: {
    contentQuality: number;
    authorCredibility: number;
    siteReputation: number;
    userExperience: number;
    transparency: number;
  };
}

interface TrustBlockResult {
  id: string;
  url: string;
  eatScore: EATScore;
  trustSignals: TrustSignal[];
  authorCredibility: AuthorCredentials;
  contentQuality: {
    factualAccuracy: number;
    sourcesCited: number;
    dateRelevance: number;
    comprehensiveness: number;
    originalResearch: number;
  };
  siteCredibility: {
    domainAge: number;
    sslCertificate: boolean;
    privacyPolicy: boolean;
    contactInformation: boolean;
    aboutPage: boolean;
    termsOfService: boolean;
  };
  recommendations: Array<{
    category: 'expertise' | 'authoritativeness' | 'trustworthiness';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  overallScore: number;
  createdAt: Date;
}

export default function TrustBlockPage() {
  const { user } = useAuth();
  const { provenance, markLive, setProvenance } = useProvenance();
  const [analysisUrl, setAnalysisUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentResult, setCurrentResult] = useState<TrustBlockResult | null>(null);
  const [selectedTab, setSelectedTab] = useState("overview");

  const simulateTrustAnalysis = async (url: string): Promise<TrustBlockResult> => {
    setProvenance(null);
    // Simulate progressive analysis
    for (let i = 0; i <= 100; i += 15) {
      setAnalysisProgress(i);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    const rng = createDeterministicRng([url, 'trust-block']);
    const pickStatus = (thresholds: number[], labels: Array<'present' | 'missing' | 'weak' | 'strong'>) => {
      const r = rng();
      for (let i=0;i<thresholds.length;i++) if (r < thresholds[i]) return labels[i];
      return labels[labels.length-1];
    };
    const mockResult: TrustBlockResult = {
      id: `trust_${Date.now()}`,
      url,
      eatScore: {
        expertise: randomInt(rng,70,100),
        authoritativeness: randomInt(rng,65,95),
        trustworthiness: randomInt(rng,75,100),
        overall: randomInt(rng,70,95),
        breakdown: {
          contentQuality: randomInt(rng,70,100),
          authorCredibility: randomInt(rng,65,90),
          siteReputation: randomInt(rng,60,90),
          userExperience: randomInt(rng,80,100),
          transparency: randomInt(rng,65,100)
        }
      },
      trustSignals: [
        {
          signal: 'Author Bio',
          status: pickStatus([0.3,1], ['missing','present']),
          impact: 'high',
          score: randomInt(rng,60,100),
          recommendations: ['Add comprehensive author biography', 'Include professional credentials'],
          description: 'Clear author identification and background information'
        },
        {
          signal: 'Contact Information',
          status: pickStatus([0.4,1], ['weak','present']),
          impact: 'medium',
          score: randomInt(rng,70,100),
          recommendations: ['Provide multiple contact methods', 'Display physical address'],
          description: 'Easy ways for users to contact the organization'
        },
        {
          signal: 'Privacy Policy',
          status: pickStatus([0.2,1], ['missing','present']),
          impact: 'high',
          score: randomInt(rng,80,100),
          recommendations: ['Create comprehensive privacy policy', 'Make easily accessible'],
          description: 'Clear data handling and privacy practices'
        },
        {
          signal: 'External Citations',
          status: pickStatus([0.5,1], ['weak','strong']),
          impact: 'high',
          score: randomInt(rng,65,100),
          recommendations: ['Add more authoritative sources', 'Include recent citations'],
          description: 'References to credible external sources'
        },
        {
          signal: 'Regular Updates',
          status: pickStatus([0.6,1], ['weak','present']),
          impact: 'medium',
          score: randomInt(rng,60,90),
          recommendations: ['Update content regularly', 'Show last modified dates'],
          description: 'Fresh and current content maintenance'
        }
      ],
      authorCredibility: {
        name: 'Dr. Sarah Johnson',
        bio: rng() > 0.3,
        credentials: ['PhD in Marketing', 'Digital Strategy Consultant', '15+ years experience'],
        experience: '15+ years in digital marketing and SEO strategy',
        linkedinProfile: rng() > 0.4,
        authorPhoto: rng() > 0.5,
        contactInfo: rng() > 0.6,
        expertiseAreas: ['SEO Strategy', 'Content Marketing', 'Digital Analytics', 'Conversion Optimization']
      },
      contentQuality: {
        factualAccuracy: randomInt(rng,80,100),
        sourcesCited: randomInt(rng,12,27),
        dateRelevance: randomInt(rng,75,100),
        comprehensiveness: randomInt(rng,70,100),
        originalResearch: randomInt(rng,50,90)
      },
      siteCredibility: {
        domainAge: randomInt(rng,5,15),
        sslCertificate: rng() > 0.1,
        privacyPolicy: rng() > 0.2,
        contactInformation: rng() > 0.3,
        aboutPage: rng() > 0.1,
        termsOfService: rng() > 0.4
      },
      recommendations: [
        {
          category: 'expertise',
          priority: 'high',
          title: 'Enhance author credentials',
          description: 'Display comprehensive author qualifications and expertise',
          impact: 'Improved content credibility and search engine trust',
          effort: 'medium'
        },
        {
          category: 'authoritativeness',
          priority: 'high',
          title: 'Add authoritative citations',
          description: 'Include more references to reputable sources and studies',
          impact: 'Higher content authority and topical relevance',
          effort: 'low'
        },
        {
          category: 'trustworthiness',
          priority: 'medium',
          title: 'Improve transparency',
          description: 'Add clear contact information and organizational details',
          impact: 'Increased user and search engine trust',
          effort: 'low'
        }
      ],
      overallScore: randomInt(rng,75,100),
      createdAt: new Date()
    };
    markLive();
    return tagSynthetic(mockResult);
  };

  const handleAnalyze = async () => {
    if (!analysisUrl || !user) {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentResult(null);

    try {
      const result = await simulateTrustAnalysis(analysisUrl);
      setCurrentResult(result);

      // Save result to database
      await addDoc(collection(db, 'trustBlockResults'), {
        userId: user.uid,
        ...result,
        createdAt: new Date()
      });

      toast.success("Trust analysis completed successfully!");

    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const exportResults = () => {
    if (!currentResult) return;
    
    const exportData = {
      url: currentResult.url,
      analysis: currentResult,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trust-block-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Results exported successfully!");
  };

  const radarData = currentResult ? [
    { subject: 'Expertise', A: currentResult.eatScore.expertise, fullMark: 100 },
    { subject: 'Authoritativeness', A: currentResult.eatScore.authoritativeness, fullMark: 100 },
    { subject: 'Trustworthiness', A: currentResult.eatScore.trustworthiness, fullMark: 100 },
    { subject: 'Content Quality', A: currentResult.eatScore.breakdown.contentQuality, fullMark: 100 },
    { subject: 'Site Reputation', A: currentResult.eatScore.breakdown.siteReputation, fullMark: 100 },
    { subject: 'Transparency', A: currentResult.eatScore.breakdown.transparency, fullMark: 100 }
  ] : [];

  const trustSignalData = currentResult?.trustSignals.map(signal => ({
    name: signal.signal,
    score: signal.score,
    impact: signal.impact === 'high' ? 100 : signal.impact === 'medium' ? 70 : 40
  })) || [];

  return (
    <FeatureGate feature="trust_block" requiredTier="starter" showUpgrade>
    <main className="container mx-auto py-6 space-y-6">
      <ToolPageHeader
        title="TrustBlock™"
        description="E-A-T optimization and content authenticity analysis."
        badges={composeToolHeaderBadges("trust-block", provenance)}
        showBreadcrumb
      />

      {/* Analysis Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Trust Analysis Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="analysis-url">Website URL</Label>
              <Input
                id="analysis-url"
                placeholder="https://example.com"
                value={analysisUrl}
                onChange={(e) => setAnalysisUrl(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !analysisUrl}
                className="min-w-[140px]"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Analyze Trust
                  </>
                )}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span>Analyzing E-A-T signals and trust indicators...</span>
                  <span>{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} className="w-full" />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {currentResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Trust Analysis Results</h2>
              <Button onClick={exportResults} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Overall E-A-T Score */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2 text-success-foreground">
                    {currentResult.eatScore.overall}/100
                  </div>
                  <p className="text-lg text-muted-foreground mb-4">Overall E-A-T Score</p>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {currentResult.eatScore.expertise}
                      </div>
                      <p className="text-sm text-muted-foreground">Expertise</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent-foreground">
                        {currentResult.eatScore.authoritativeness}
                      </div>
                      <p className="text-sm text-muted-foreground">Authoritativeness</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success-foreground">
                        {currentResult.eatScore.trustworthiness}
                      </div>
                      <p className="text-sm text-muted-foreground">Trustworthiness</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="signals">Trust Signals</TabsTrigger>
                <TabsTrigger value="author">Author</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>E-A-T Radar Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name="Score"
                            dataKey="A"
                            stroke="hsl(var(--chart-1))"
                            fill="hsl(var(--chart-1))"
                            fillOpacity={0.3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Trust Signal Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={trustSignalData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="score" fill="hsl(var(--chart-1))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>E-A-T Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(currentResult.eatScore.breakdown).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex justify-between mb-2">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="font-semibold">{value}/100</span>
                          </div>
                          <Progress value={value} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="signals" className="space-y-4">
                <div className="space-y-4">
                  {currentResult.trustSignals.map((signal, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {signal.status === 'present' || signal.status === 'strong' ? (
                              <CheckCircle2 className="h-6 w-6 text-success-foreground" />
                            ) : signal.status === 'weak' ? (
                              <AlertTriangle className="h-6 w-6 text-warning-foreground" />
                            ) : (
                              <XCircle className="h-6 w-6 text-destructive-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{signal.signal}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  signal.status === 'present' || signal.status === 'strong' ? 'default' :
                                  signal.status === 'weak' ? 'secondary' : 'destructive'
                                }>
                                  {signal.status}
                                </Badge>
                                <Badge variant="outline">
                                  {signal.impact} impact
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{signal.description}</p>
                            <div className="mb-3">
                              <div className="flex justify-between mb-1">
                                <span className="text-sm">Score</span>
                                <span className="text-sm font-medium">{signal.score}/100</span>
                              </div>
                              <Progress value={signal.score} className="h-2" />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Recommendations:</Label>
                              <ul className="text-sm mt-1 space-y-1">
                                {signal.recommendations.map((rec, recIndex) => (
                                  <li key={recIndex} className="flex items-center gap-2">
                                    <TrendingUp className="h-3 w-3 text-success-foreground" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="author" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Author Credibility Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl">
                        {currentResult.authorCredibility.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{currentResult.authorCredibility.name}</h3>
                        <p className="text-sm text-muted-foreground">{currentResult.authorCredibility.experience}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium">Credentials & Qualifications</Label>
                        <div className="space-y-2 mt-2">
                          {currentResult.authorCredibility.credentials.map((credential, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                              <Award className="h-4 w-4 text-warning-foreground" />
                              {credential}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Expertise Areas</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {currentResult.authorCredibility.expertiseAreas.map((area, index) => (
                            <Badge key={index} variant="outline">{area}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-3 bg-muted rounded">
                        <span className="text-sm">Author Bio</span>
                        {currentResult.authorCredibility.bio ? (
                          <CheckCircle2 className="h-5 w-5 text-success-foreground" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive-foreground" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded">
                        <span className="text-sm">LinkedIn Profile</span>
                        {currentResult.authorCredibility.linkedinProfile ? (
                          <CheckCircle2 className="h-5 w-5 text-success-foreground" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive-foreground" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded">
                        <span className="text-sm">Author Photo</span>
                        {currentResult.authorCredibility.authorPhoto ? (
                          <CheckCircle2 className="h-5 w-5 text-success-foreground" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Content Quality Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(currentResult.contentQuality).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex justify-between mb-2">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="font-semibold">
                              {typeof value === 'number' ? (
                                key === 'sourcesCited' ? value : `${value}/100`
                              ) : value}
                            </span>
                          </div>
                          {typeof value === 'number' && key !== 'sourcesCited' && (
                            <Progress value={value} className="h-2" />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Site Credibility Factors</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(currentResult.siteCredibility).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          {typeof value === 'boolean' ? (
                            value ? (
                              <CheckCircle2 className="h-5 w-5 text-success-foreground" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive-foreground" />
                            )
                          ) : (
                            <Badge variant="outline">{value} years</Badge>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <div className="space-y-4">
                  {currentResult.recommendations.map((rec, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {rec.category === 'expertise' && <Brain className="h-6 w-6 text-primary" />}
                            {rec.category === 'authoritativeness' && <Award className="h-6 w-6 text-accent-foreground" />}
                            {rec.category === 'trustworthiness' && <Shield className="h-6 w-6 text-success-foreground" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{rec.title}</h4>
                              <Badge variant={
                                rec.priority === 'high' ? 'destructive' : 
                                rec.priority === 'medium' ? 'default' : 'secondary'
                              }>
                                {rec.priority} priority
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {rec.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="h-4 w-4 text-success-foreground" />
                                <span className="text-success-foreground">{rec.impact}</span>
                              </div>
                              <Badge variant={
                                rec.effort === 'low' ? 'default' : 
                                rec.effort === 'medium' ? 'secondary' : 'destructive'
                              }>
                                {rec.effort} effort
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  </FeatureGate>
  );
}
