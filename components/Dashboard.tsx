import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { GoogleGenAI } from '@google/genai';

const PRESET_AMOUNTS: { label: string; value: bigint }[] = [
  { label: '+1 Thousand', value: BigInt(1000) },
  { label: '+1 Million', value: BigInt(1_000_000) },
  { label: '+1 Billion', value: BigInt(1_000_000_000) },
  { label: '+1 Trillion', value: BigInt(1_000_000_000_000) },
];

const ULTRA_CREDITS = BigInt('1' + '0'.repeat(66));
const COST_PER_GENERATION = BigInt(100);
const COST_PER_VIDEO_GENERATION = BigInt(10000);

// IMPORTANT: This key is a placeholder and will be managed by the execution environment.
const API_KEY = process.env.API_KEY as string;

const Dashboard: React.FC = () => {
  const [balance, setBalance] = useState<bigint>(BigInt(20000)); // Start with enough credits for video
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isUltraPlanActive, setIsUltraPlanActive] = useState(false);

  // AI Assistant State
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  // Video Generation State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoGenerationMessage, setVideoGenerationMessage] = useState('');

  // Clean up object URL when component unmounts or URL changes
  useEffect(() => {
    const currentUrl = generatedVideoUrl;
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [generatedVideoUrl]);


  const handleAddCredits = () => {
    setError('');
    if (!amount) {
      setError('Please enter an amount.');
      return;
    }
    try {
      const amountToAdd = BigInt(amount);
      if (amountToAdd <= 0) {
        setError('Amount must be a positive number.');
        return;
      }
      setBalance(prevBalance => prevBalance + amountToAdd);
      setAmount('');
    } catch (e) {
      setError('Invalid number format. Please enter a valid integer.');
    }
  };
  
  const handlePresetAdd = (presetValue: bigint) => {
    setError('');
    setBalance(prevBalance => prevBalance + presetValue);
  }

  const handleActivateUltraPlan = () => {
    setBalance(prevBalance => prevBalance + ULTRA_CREDITS);
    setIsUltraPlanActive(true);
  };
  
  const handleGenerate = async () => {
      if (!prompt.trim()) {
        setAiError('Prompt cannot be empty.');
        return;
      }
      if (!isUltraPlanActive && balance < COST_PER_GENERATION) {
          setAiError('Not enough credits to generate. Add more credits or activate the Ultra Plan.');
          return;
      }

      setIsGenerating(true);
      setAiError('');
      setAiResponse('');

      try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        
        setAiResponse(response.text);

        if (!isUltraPlanActive) {
            setBalance(prev => prev - COST_PER_GENERATION);
        }

      } catch(e) {
        console.error(e);
        let errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        if (typeof errorMessage === 'string' && (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota exceeded'))) {
          errorMessage = 'API quota has been exceeded. Please check your Google AI/Labs account or try again later.';
        }
        setAiError(`Failed to generate content: ${errorMessage}`);
      } finally {
        setIsGenerating(false);
      }
  };
  
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
        setVideoError('Video prompt cannot be empty.');
        return;
    }
    if (!isUltraPlanActive && balance < COST_PER_VIDEO_GENERATION) {
        setVideoError('Not enough credits for video generation. Add more credits or activate the Ultra Plan.');
        return;
    }

    setIsGeneratingVideo(true);
    setVideoError('');
    setGeneratedVideoUrl(null);
    setVideoGenerationMessage('Initializing video generation... This may take a few minutes.');

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: videoPrompt,
            config: { numberOfVideos: 1 }
        });

        setVideoGenerationMessage('Video generation is in progress. Polling for results...');

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
            setVideoGenerationMessage(`Checking progress... Status: ${operation.metadata?.state || 'processing'}`);
        }

        if (operation.error) {
            // FIX: Ensure argument to Error constructor is a string by using a template literal.
            // The `message` property on the operation error can be of type `unknown`.
            throw new Error(`${operation.error.message || 'Video generation failed in operation.'}`);
        }

        setVideoGenerationMessage('Generation complete! Downloading video...');
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error('Could not retrieve video download link.');
        }

        const videoResponse = await fetch(`${downloadLink}&key=${API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        const videoBlob = await videoResponse.blob();
        setGeneratedVideoUrl(URL.createObjectURL(videoBlob));

        if (!isUltraPlanActive) {
            setBalance(prev => prev - COST_PER_VIDEO_GENERATION);
        }
    } catch (e) {
        console.error(e);
        let errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        if (typeof errorMessage === 'string' && (errorMessage.includes('429') || errorMessage.toLowerCase().includes('quota exceeded'))) {
          errorMessage = 'API quota has been exceeded. Please check your Google AI/Labs account or try again later.';
        }
        setVideoError(`Failed to generate video: ${errorMessage}`);
    } finally {
        setIsGeneratingVideo(false);
        setVideoGenerationMessage('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        
        {/* Creative Assistant Card */}
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Creative Assistant</CardTitle>
                <CardDescription>Use your Flow Credits to generate content with Google AI.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Textarea 
                        placeholder="e.g., Write a short story about a robot who discovers music."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        rows={4}
                        disabled={isGenerating}
                    />
                    {aiError && <p className="text-sm text-red-600">{aiError}</p>}
                    {aiResponse && (
                        <div className="p-4 bg-gray-50 border rounded-md max-h-60 overflow-y-auto">
                            <p className="text-gray-800 whitespace-pre-wrap">{aiResponse}</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                    Cost: {isUltraPlanActive ? 'Free' : `${COST_PER_GENERATION.toString()} Credits`}
                </p>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
            </CardFooter>
        </Card>
        
        {/* Video Generation Card */}
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Video Generation</CardTitle>
                <CardDescription>Use your Flow Credits to generate a video with Google AI.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Textarea
                        placeholder="e.g., A majestic lion roaring on a rocky outcrop at sunset, cinematic."
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        rows={3}
                        disabled={isGeneratingVideo}
                    />
                    {videoError && <p className="text-sm text-red-600">{videoError}</p>}
                    {isGeneratingVideo && <p className="text-sm text-blue-600">{videoGenerationMessage}</p>}
                    {generatedVideoUrl && (
                        <div className="mt-4 border rounded-md overflow-hidden">
                            <video src={generatedVideoUrl} controls autoPlay loop className="w-full"></video>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                    Cost: {isUltraPlanActive ? 'Free' : `${COST_PER_VIDEO_GENERATION.toLocaleString()} Credits`}
                </p>
                <Button onClick={handleGenerateVideo} disabled={isGeneratingVideo}>
                    {isGeneratingVideo ? 'Generating Video...' : 'Generate Video'}
                </Button>
            </CardFooter>
        </Card>


        {/* Credit Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Add Credits</CardTitle>
                <CardDescription>Add a custom amount or use a preset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="credit-amount" className="text-sm font-medium text-gray-700">Custom Amount</label>
                  <div className="flex space-x-2">
                    <Input
                      id="credit-amount"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g., 1000"
                      value={amount}
                      onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*$/.test(val)) {
                              setAmount(val);
                          }
                      }}
                      disabled={isUltraPlanActive}
                    />
                    <Button onClick={handleAddCredits} disabled={isUltraPlanActive}>Add</Button>
                  </div>
                  {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                </div>
                <div className="pt-2">
                   <div className="grid grid-cols-2 gap-2 mt-2">
                      {PRESET_AMOUNTS.map(preset => (
                           <Button key={preset.label} onClick={() => handlePresetAdd(preset.value)} variant="outline" size="sm" disabled={isUltraPlanActive}>
                              {preset.label}
                          </Button>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-700 to-purple-800 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center space-x-2">
                  <span>AI Ultra Plan</span>
                </CardTitle>
                <CardDescription className="text-indigo-200">
                  Unlock unlimited potential, forever.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-indigo-100">
                  <li className="flex items-center space-x-2"><span>✓</span><span>Infinite Flow Credits.</span></li>
                  <li className="flex items-center space-x-2"><span>✓</span><span>Priority AI access.</span></li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleActivateUltraPlan} 
                  disabled={isUltraPlanActive}
                  className="w-full bg-white text-indigo-700 font-bold hover:bg-gray-200 disabled:bg-gray-400 disabled:text-gray-700 disabled:cursor-not-allowed"
                >
                  {isUltraPlanActive ? 'Plan Activated' : 'Activate for Free'}
                </Button>
              </CardFooter>
            </Card>
        </div>
      </div>

      <Card className="lg:col-span-1 bg-blue-600 text-white flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-2xl">Your Balance</CardTitle>
          <CardDescription className="text-blue-200">Total available credits.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl lg:text-5xl font-bold break-all" style={{ overflowWrap: 'break-word' }}>
              {isUltraPlanActive ? '∞' : balance.toLocaleString()}
            </p>
            <p className="text-lg text-blue-100 mt-2">Credits</p>
          </div>
        </CardContent>
        {isUltraPlanActive && (
           <CardFooter className="justify-center !pt-0 pb-4">
             <div className="text-center px-4 py-2 rounded-full bg-yellow-400 text-blue-800 text-sm font-bold shadow-lg">
               ✨ AI Ultra Plan Active
             </div>
           </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;