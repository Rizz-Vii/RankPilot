// src/components/serp-view-results.tsx
import type { SerpViewOutput } from "@/ai/flows/serp-view";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  ListOrdered,
  HelpCircle,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Newspaper,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";

interface SerpViewResultsProps {
  results: SerpViewOutput;
}

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const SerpFeatures: React.FC<{ features: SerpViewOutput["serpFeatures"] }> = ({
  features,
}) => {
  const featureItems = [
    {
      name: "Featured Snippet",
      icon: Award,
      present: features.hasFeaturedSnippet,
    },
    { name: "Image Pack", icon: ImageIcon, present: features.hasImagePack },
    { name: "Video Carousel", icon: Video, present: features.hasVideoCarousel },
    { name: "Top Stories", icon: Newspaper, present: features.topStories },
  ].filter((item) => item.present);

  if (featureItems.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 bg-muted/50 shadow-xl hover:shadow-2xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="font-headline text-lg">
          SERP Features Detected
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          className="flex flex-wrap gap-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {featureItems.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.name} variants={itemVariant}>
                <Badge variant="secondary" className="text-sm py-1 px-3">
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Badge>
              </motion.div>
            );
          })}
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default function SerpViewResults({ results }: SerpViewResultsProps) {
  return (
    <motion.div
      className="space-y-6 mt-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariant}>
        {results.serpFeatures && (
          <SerpFeatures features={results.serpFeatures} />
        )}
      </motion.div>

      <motion.div variants={itemVariant}>
        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <ListOrdered /> Organic Search Results
            </CardTitle>
            <CardDescription>
              A simulation of the top 10 organic search results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.organicResults.map((result) => (
              <motion.div
                key={result.position}
                className="flex gap-4 p-4 rounded-lg transition-all duration-300 ease-in-out hover:bg-muted/50 hover:shadow-lg hover:scale-[1.02] origin-center"
                variants={itemVariant}
              >
                <div className="text-lg font-bold text-muted-foreground pt-1">
                  {result.position}.
                </div>
                <div>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-lg"
                  >
                    <h3 className="font-headline">{result.title}</h3>
                  </a>
                  <div className="flex items-center gap-2 text-green-700 text-sm font-body">
                    <LinkIcon className="h-3 w-3" />
                    <span className="truncate">{result.url}</span>
                  </div>
                  <p className="text-muted-foreground text-sm font-body mt-1">
                    {result.snippet}
                  </p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {results.peopleAlsoAsk && results.peopleAlsoAsk.length > 0 && (
        <motion.div variants={itemVariant}>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2">
                <HelpCircle /> People Also Ask
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {results.peopleAlsoAsk.map((item, index) => (
                  <motion.div key={index} variants={itemVariant}>
                    <AccordionItem value={`item-${index}`}>
                      <AccordionTrigger className="font-body text-left hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="font-body text-sm text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
