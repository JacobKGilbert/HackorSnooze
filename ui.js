$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $favArticles = $('#favorited-articles')

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;
  let favs = localStorage.getItem('favorites') || []
  let parsedFavs = JSON.parse(favs)

  await checkIfLoggedIn();

  /** Event listener for logging in.
   *  If successfully we will setup the user instance
   */
  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /** Event listener for signing up.
   *  If successfully we will setup a new user instance
   */
  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /** Event Handler for New Posts */
  $submitForm.on('submit', async function(evt) {
    evt.preventDefault() // no page refresh

    // grab required fields
    let story = {
      author: $('#author').val(),
      title: $('#title').val(),
      url: $('#url').val(),
    }
    let user = {
      username: localStorage.getItem('username'),
      token: localStorage.getItem('token'),
    }

    const newStory = await storyList.addStory(user, story)
    const htmlStory = generateStoryHTML(newStory)
    $allStoriesList.prepend(htmlStory)
    $submitForm.trigger('reset')
  })

  /** Log Out Functionality */
  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /** Event Handler for Clicking Login */
  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /** Event Handler for Clicking Favorite Icon */
  async function handleFavClick(evt) {
    const selectStoryLi = evt.target.closest('li')
    const selectStoryId = selectStoryLi.id
    let user = {
      username: localStorage.getItem('username'),
      token: localStorage.getItem('token'),
    }
    let newFavsArr

    if (parsedFavs.includes(selectStoryId)) {
      newFavsArr = await currentUser.unFavorite(user, selectStoryId)
    } else {
      newFavsArr = await currentUser.favorite(user, selectStoryId)
    }

    localStorage.setItem('favorites', newFavsArr)
    location.reload()
  }

  /** Event Handler for Clicking Edit Icon */
  function handleEditClick(evt) {
    
  }

  /** Event Handler for Clicking Delete Icon */
  async function handleTrashClick(evt) {
    const selectStoryLi = evt.target.closest('li')
    const selectStoryId = selectStoryLi.id

    if(window.confirm('Are you sure you want to delete this story?')) {
      const msg = await storyList.removeStory(selectStoryId)
      selectStoryLi.remove()
      alert(msg)
    }
  }

  /** Event handler for Navigation to Homepage */
  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /** On page load, checks local storage to see if the user is already logged in. Renders page information accordingly. */
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();
    
    if (currentUser) {
      localStorage.setItem('favorites', currentUser.favorites)
      showNavForLoggedInUser();
      showFavOptForUser()
      showOptForOwnPost()
    }
  }

  /** A rendering function to run to reset the forms and hide the login info */
  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();
    
    // Show User options
    showFavOptForUser()
    showOptForOwnPost()
    // update the navigation bar
    showNavForLoggedInUser();
  }

  /** A rendering function to call the StoryList.getStories static method, which will generate a storyListInstance. Then render it.
   */
  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      const favCopy = generateStoryHTML(story)

      if (parsedFavs.includes(story.storyId)) {
        console.log('generateStories Story: ', story.storyId);
        
        $favArticles.append(favCopy)
      }
      $allStoriesList.append(result);
    }
  }

  /** Render HTML for an individual Story instance */
  function generateStoryHTML(story) { 
    let hostName = getHostName(story.url);
    //Configure which style of star is used.
    let favIconStyle = favoritedStyle(story)

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname">(${hostName})</small>
        <span class="favorite"><i class="${favIconStyle}"></i></span>
        <span class="edit"><i class="far fa-edit"></i></span>
        <span class="delete"><i class="far fa-trash-alt"></i></span>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `)
    
    return storyMarkup;
  }

  /** hide all elements in elementsArr */
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  /** if logged in, show and hide relevent information */
  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $submitForm.show()
    $favArticles.show()
  }

  function showFavOptForUser() {
    const $favIcons = $('.fa-star')
    $favIcons.show()
    $favIcons.on('click', handleFavClick)
  }

  function favoritedStyle(story) {
    //Solid star
    const favStyle = "fas fa-star"
    //Hollow Star
    const notfavStyle = "far fa-star"

    if (parsedFavs.includes(story.storyId)) {
      return favStyle
    } else {
      return notfavStyle
    }
  }

  function showOptForOwnPost() {
    for (const story of storyList.stories) {
      const storyUsername = story.username
      if (currentUser.username === storyUsername) {
        const $editIcon = $(`#${story.storyId}`).find('.fa-edit')
        const $trashIcon = $(`#${story.storyId}`).find('.fa-trash-alt')
        //Show icons on User's own posts
        $editIcon.show()
        $trashIcon.show()
        //Add event handlers onto each icon
        $editIcon.on('click', handleEditClick)
        $trashIcon.on('click', handleTrashClick)
      }
    }
  }

  /** simple function to pull the hostname from a URL */
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /** sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
      localStorage.setItem("favorites", currentUser.favorites)
    }
  }
});
