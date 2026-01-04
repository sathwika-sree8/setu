"use client"

import React,{useState, useActionState} from 'react'
import { Input } from '@/components/ui/input';
import {Textarea} from "@/components/ui/textarea";
import MDEditor from '@uiw/react-md-editor';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import {formSchema} from "@/lib/validation";
import {z} from "zod";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createPitch } from '@/lib/action';

const StartupForm = () => {
    const [errors,setErrors]=useState<Record<string,string>>({});
    const [pitch,setPitch]=useState("");
    const { toast } = useToast();
    const router = useRouter();
    const handleFormSubmit = async (prevState:any, formData:FormData) => {
        try{
            const formValues={
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                category: formData.get("category") as string,
                link: formData.get("link") as string,
                pitch,
            }
            await formSchema.parseAsync(formValues);
            console.log(formValues);
            const result=await createPitch(prevState, formData, pitch)
           //console.log(result)
           if(result.status=='SUCCESS'){
            toast({
                title:"SUCCESS",
                description:"Your startup pitch has been created successfully",
            });
            router.push(`/startup/${result._id}`)
           }
           return result; 
        }catch(error){
             if(error instanceof z.ZodError){
                const fieldErorrs = error.flatten().fieldErrors;
                setErrors(fieldErorrs as unknown as Record<string, string>);
                toast({
                    title:'Error',
                    description:'Please check your inputs and try again',
                    variant: 'destructive',
                });
                return { ...prevState, error: 'Validation failed' , status: "ERROR"};

             }
             toast({
                    title:'Error',
                    description:'An unexpected error has occured',
                    variant: 'destructive',
                });
             return {
                ...prevState,
                error: "An unexpected error has occured",
                status: "ERROR"
             };
        }
    };
    const [state,formAction,isPending]= useActionState(handleFormSubmit,{error:"",status:"INITIAL"});
    
  return (
    <form action={formAction} className="startup-form">
        <div className="flex flex-col gap-2">
            <label htmlFor="title" className="startup-form_label">
                Title
            </label>
            <input 
                id="title" 
                name="title" 
                className="startup-form_input" 
                required
                placeholder="Enter the title "
                />
                {errors.title && <p className="startup-form_error">{errors.title}</p>}
         </div>
         <div>
            <label htmlFor="description" className="startup-form_label">
                Description
                </label>
                <Textarea
                id="description" 
                name="description" 
                className="startup-form_textarea" 
                required
                placeholder="Enter the description "
                />
                {errors.description && <p className="startup-form_error">{errors.description}</p>}
         </div>
         <div className="flex flex-col gap-2">
            <label htmlFor="category" className="startup-form_label">
                Category
            </label>
                <input 
                id="category" 
                name="category" 
                className="startup-form_input" 
                required
                placeholder="Enter the category (Tech, Health, Education etc.)"
                />
                {errors.category && <p className="startup-form_error">{errors.category}</p>}
         </div>
         <div className="flex flex-col gap-2">
            <label htmlFor="link" className="startup-form_label">
                Image URL
            </label>
            <input 
                id="link" 
                name="link" 
                className="startup-form_input" 
                required
                placeholder="Enter the Image URL "
                />
                {errors.link && <p className="startup-form_error">{errors.link}</p>}
         </div>
         <div data-color-mode="light">
            <label htmlFor="pitch" className="startup-form_label">
                Pitch
                </label>
                <MDEditor
                    value={pitch}
                    onChange={(value)=>setPitch(value as string)}
                    id="ptich"
                    preview="edit"
                    height={300}
                    style={{borderRadius:20,overflow:"hidden"}}
                    textareaProps={{
                        placeholder:
                          "Briefly describe your idea and what problem it solves",
                    }}
                    previewOptions={{
                        disallowedElements:['style'],
                    }}
                />
                {errors.pitch && <p className="startup-form_error">{errors.pitch}</p>}
         </div>
         <Button type="submit" className="startup-form_btn text-white" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Startup Pitch"}
        <Send className="size-6 ml-2"/>
         </Button>
    </form>
  ) ; 
};

export default StartupForm
