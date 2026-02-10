import { UserIcon } from "lucide-react";
import { defineType,defineField } from "sanity";

export const author=defineType({
    name: 'author',
    title: 'Author',
    type: 'document',
    icon: UserIcon,
    fields: [
        defineField({
            name: "clerkId",
            title: "Clerk User ID",
            type: "string",
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name:'id',
            type:'number',
        }),
        defineField({
            name:'name',
            type:'string',
        }),
        defineField({
            name:'username',
            type:'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name:'email',
            type:'string',
        }),

        defineField({
            name:'image',
            type:'url',
        }),
        defineField({
            name:'bio',
            type:'text',
        }),
    ],
    preview:{
        select:{
            title:'name',
        }
    }
})

