# trent-backend

## Outline of relevant routes

(Remember to take care what kind of http request (POST, GET, ...) the routes use.)

general prefix: /api
- /users
    - /create : create a user
    - /user : get user by uid
    - /updateItems : Items von User angeben (Input: Liste an typeIds)
    - /update : update user (actually replace) (same input like in /create but with an additional uid)
    - /delete : delete user (actually only sets deleted property to true and deletes items)
    - /uploadPicture : upload profile picture
    - /deletePicture : delete profile picture
    - /addAPNToken : add some token for pushnotifications
- /posts
    - /create : create a post
    - /getAroundLocation: get recent posts within a givien radius around a location
    - /post/:id : get post with specific _id 
    - /setStatus/:id : set Status (if the borrower still needs to find someone to lend him stuff) of a post
    - /update/:id : like create, just update instead of creating sth new
    - /delete/:id : delete a post
- /chats
    - /sendMessage : send a message to someone
    - /getChatsOfUser : get all chats of a user
    - /chat/:id : get specific chat
    - /getNewMessages : get all chats of a user with messages the user has not read yet
    
you often get a response from the routes. The thing you actually want is most likely response.data .



