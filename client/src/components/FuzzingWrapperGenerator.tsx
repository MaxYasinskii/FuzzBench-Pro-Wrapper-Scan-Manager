import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Copy, Download, Trash2, Calendar, FileCode } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

const wrapperSchema = z.object({
  language: z.enum(["c_cpp", "ruby", "python"]),
  path: z.string().min(1, "Source code path is required"),
  binaryPath: z.string().optional(),
  generator: z.string().default("default"),
  options: z.string().optional(),
}).refine((data) => {
  // Для Ruby binary path обязателен
  if (data.language === "ruby" && (!data.binaryPath || data.binaryPath.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Binary path is required for Ruby",
  path: ["binaryPath"],
});

type WrapperFormData = z.infer<typeof wrapperSchema>;

export default function FuzzingWrapperGenerator() {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedWrappers, setExpandedWrappers] = useState<Record<string, boolean>>({});

  // Fetch wrappers from server
  const { data: wrappers = [], isLoading: isLoadingWrappers } = useQuery({
    queryKey: ['/api/wrappers'],
    retry: false,
  });

  const form = useForm<WrapperFormData>({
    resolver: zodResolver(wrapperSchema),
    defaultValues: {
      language: "c_cpp" as const,
      path: "",
      binaryPath: "",
      generator: "default",
      options: "",
    },
  });

  const generateWrapperMutation = useMutation({
    mutationFn: async (data: WrapperFormData) => {
      const payload = {
        language: data.language,
        path: data.path,
        options: data.options ? JSON.parse(data.options) : undefined,
      };
      
      const response = await apiRequest("POST", "/api/wrappers/generate", payload);
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wrappers'] });
      
      if (result.wrapper) {
        setExpandedWrappers(prev => ({
          ...prev,
          [result.wrapper.id]: true
        }));
      }
      
      toast({
        title: lang === 'ru' ? 'Обёртка создана' : 'Wrapper generated successfully',
        description:
          lang === 'ru'
            ? `Создан файл ${result.wrapper?.filename || 'wrapper'} для ${form.getValues().language}`
            : `Generated ${result.wrapper?.filename || 'wrapper'} for ${form.getValues().language}`,
      });
      
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: lang === 'ru' ? 'Ошибка генерации' : 'Generation failed',
        description:
          error.message ||
          (lang === 'ru' ? 'Не удалось сгенерировать обёртку' : 'Failed to generate fuzzing wrapper'),
        variant: 'destructive',
      });
    },
  });



  // Delete wrapper mutation
  const deleteWrapperMutation = useMutation({
    mutationFn: async (wrapperId: number) => {
      const response = await apiRequest("DELETE", `/api/wrappers/${wrapperId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wrappers'] });
      toast({
        title: lang === 'ru' ? 'Обёртка удалена' : 'Wrapper deleted',
        description: lang === 'ru' ? 'Обёртка успешно удалена' : 'Wrapper has been deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: lang === 'ru' ? 'Ошибка удаления' : 'Delete failed',
        description: error.message || (lang === 'ru' ? 'Не удалось удалить обёртку' : 'Failed to delete wrapper'),
        variant: 'destructive',
      });
    },
  });



  const downloadWrapper = (wrapper: any) => {
    const blob = new Blob([wrapper.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = wrapper.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (wrapper: any) => {
    try {
      await navigator.clipboard.writeText(wrapper.code);
      toast({
        title: lang === 'ru' ? 'Код скопирован' : 'Code copied',
        description: lang === 'ru' ? 'Код обёртки скопирован в буфер' : 'Wrapper code copied to clipboard',
      });
    } catch (error) {
      toast({
        title: lang === 'ru' ? 'Ошибка копирования' : 'Copy failed',
        description: lang === 'ru' ? 'Не удалось скопировать код' : 'Failed to copy code to clipboard',
        variant: "destructive",
      });
    }
  };

  const deleteWrapper = (wrapperId: number) => {
    deleteWrapperMutation.mutate(wrapperId);
  };

  const toggleWrapperExpanded = (wrapperId: number) => {
    setExpandedWrappers(prev => ({
      ...prev,
      [wrapperId]: !prev[wrapperId]
    }));
  };

  const onSubmit = (data: WrapperFormData) => {
    generateWrapperMutation.mutate(data);
  };

  const clearAllWrappers = () => {
    // This would require a new API endpoint to delete all user wrappers
    // For now, we'll just show a message
    toast({
      title: lang === 'ru' ? 'Функция недоступна' : 'Feature not available',
      description: lang === 'ru' ? 'Очистка обёрток будет доступна позже' : 'Clear all wrappers feature coming soon',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ru' ? 'Генератор фуззинг‑обёрток' : 'Fuzzing Wrapper Generator'}
          </CardTitle>
          <CardDescription>
            {lang === 'ru'
              ? 'Генерация интеллектуальных фуззинг‑обёрток для C/C++ (futage), Ruby (dewrapper) и Python (PyFuzzWrap)'
              : 'Generate intelligent fuzzing wrappers for C/C++ (futage), Ruby (dewrapper) and Python (PyFuzzWrap) applications'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {lang === 'ru' ? 'Язык программирования' : 'Programming Language'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={lang === 'ru' ? 'Выберите язык' : 'Select language'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="c_cpp">C/C++ (futage)</SelectItem>
                          <SelectItem value="ruby">Ruby (dewrapper)</SelectItem>
                          <SelectItem value="python">Python (PyFuzzWrap)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="generator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {lang === 'ru' ? 'Тип генератора' : 'Generator Type'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={lang === 'ru' ? 'Выберите генератор' : 'Select generator'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="futage">Futage (C/C++)</SelectItem>
                          <SelectItem value="dewrapper">Dewrapper (Ruby)</SelectItem>
                          <SelectItem value="pyfuzzwrap">PyFuzzWrap (Python)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {lang === 'ru' ? 'Путь к исходникам' : 'Source Code Path'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="/path/to/source/code"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="binaryPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {lang === 'ru'
                        ? `Путь к бинарю ${form.watch('language') === 'ruby' ? '(обязательно для Ruby)' : '(необязательно)'}`
                        : `Binary Path ${form.watch('language') === 'ruby' ? '(Required for Ruby)' : '(Optional)'}`}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          form.watch('language') === 'ruby'
                            ? lang === 'ru'
                              ? '/path/to/ruby/binary (обязательно)'
                              : '/path/to/ruby/binary (required)'
                            : '/path/to/compiled/binary'
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="options"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {lang === 'ru' ? 'Параметры (JSON)' : 'Options (JSON)'}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"timeout": 30, "iterations": 1000}'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={generateWrapperMutation.isPending}
                className="w-full"
              >
                {generateWrapperMutation.isPending
                  ? lang === 'ru'
                    ? 'Генерация...'
                    : 'Generating...'
                  : lang === 'ru'
                    ? 'Создать обёртку'
                    : 'Generate Wrapper'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Generated Wrappers History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              {lang === 'ru'
                ? `Сгенерированные обёртки (${wrappers.length})`
                : `Generated Wrappers (${wrappers.length})`}
            </CardTitle>
            <CardDescription>
              {lang === 'ru'
                ? 'История созданных фуззинг‑обёрток'
                : 'Your generated fuzzing wrappers history'}
            </CardDescription>
          </div>
          {wrappers.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAllWrappers}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {lang === 'ru' ? 'Очистить всё' : 'Clear All'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingWrappers ? (
            <p className="text-center text-muted-foreground">
              {lang === 'ru' ? 'Загрузка обёрток...' : 'Loading wrappers...'}
            </p>
          ) : wrappers.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {lang === 'ru' ? 'Обёртки ещё не созданы. Создайте первую выше!' : 'No wrappers generated yet. Create your first fuzzing wrapper above!'}
            </p>
          ) : (
            <div className="space-y-4">
              {wrappers.map((wrapper: any) => (
                <Collapsible 
                  key={wrapper.id}
                  open={expandedWrappers[wrapper.id]}
                  onOpenChange={() => toggleWrapperExpanded(wrapper.id)}
                >
                  <div className="border rounded-lg p-4">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-3">
                          {expandedWrappers[wrapper.id] ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                          <div>
                            <h4 className="font-medium">{wrapper.filename}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary">{wrapper.language}</Badge>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(wrapper.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(wrapper);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadWrapper(wrapper);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWrapper(wrapper.id);
                            }}
                            disabled={deleteWrapperMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-4 pt-4 border-t">
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                          <code>{wrapper.code}</code>
                        </pre>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {lang === 'ru' ? 'Путь:' : 'Path:'} {wrapper.path}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}