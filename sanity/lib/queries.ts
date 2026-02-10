import {defineQuery} from "next-sanity";
export const STARTUPS_QUERY=
defineQuery(`*[_type=="startup" && defined(slug.current) && ($search == "" || title match $search || category match $search || author->name match $search)]|order(_createdAt desc){
    _id,
    title,
    slug,
    _createdAt,
    author->{_id,clerkId,id,name,image,bio
    },
    views,
    description,
    category,
    image
    }`);

    export const STARTUP_BY_ID_QUERY=
    defineQuery(`*[_type=="startup" && _id==$id][0]{
        _id,
        clerkId,
        title,
        slug,
        _createdAt,
        author->{_id,clerkId,name,username,image,bio
    },
        views ,
        description,
        category,
        image,
        pitch,
    }`);

export const STARTUP_VIEWS_QUERY=defineQuery(
   `*[_type=="startup" && _id==$id][0]{
        _id,clerkId,views
    }`
);

export const AUTHOR_BY_GITHUB_ID_QUERY=defineQuery(`
    *[_type=="author" && id == $id][0]{
        _id,
        clerkId, 
        id,
        name,
        username,
        email,
        image,
        bio
    }
`);
export const AUTHOR_BY_EMAIL_QUERY=defineQuery(`
    *[_type=="author" && email == $email][0]{
        _id,
        clerkId, 
        id,
        name,
        username,
        email,
        image,
        bio
    }
`);
export const AUTHOR_BY_ID_QUERY=defineQuery(`
    *[_type=="author" && _id == $id][0]{
        _id,
        clerkId, 
        id,
        name,
        username,
        email,
        image,
        bio
    }
`);
export const STARTUPS_BY_AUTHOR_QUERY=
defineQuery(`*[_type=="startup" && author._ref==$id]|order(_createdAt desc){
    _id,
    clerkId, 
    title,
    slug,
    _createdAt,
    author->{_id,clerkId,name,image,bio
    },
    views,
    description,
    category,
    image
    }`);

export const STARTUPS_BY_CLERK_ID_QUERY=
defineQuery(`*[_type=="startup" && author->clerkId==$clerkId]|order(_createdAt desc){
    _id,
    clerkId, 
    title,
    slug,
    _createdAt,
    author->{_id,clerkId,id,name,image,bio
    },
    views,
    description,
    category,
    image
    }`);
export const PLAYLIST_BY_SLUG_QUERY =
  defineQuery(`*[_type == "playlist" && slug.current == $slug][0]{
  _id,
  clerkId, 
  title,
  slug,
  select[]->{
    _id,
    clerkId, 
    _createdAt,
    title,
    slug,
    author->{
      _id,
      clerkId, 
      name,
      slug,
      image,
      bio
    },
    views,
    description,
    category,
    image,
    pitch
  }
}`);
export const AUTHOR_BY_CLERK_ID_QUERY = defineQuery(`
  *[_type == "author" && clerkId == $clerkId][0]{
    _id,
    clerkId,
    name,
    username,
    email,
    image,
    bio
  }
`);
export const AUTHOR_BY_USERNAME_QUERY = defineQuery(`
  *[_type=="author" && username == $username][0]{
    _id,
    clerkId,
    name,
    username,
    email,
    image,
    bio
  }
`);



