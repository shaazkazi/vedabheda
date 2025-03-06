// Initialize Supabase client
// Use the externalized config
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
console.log("Supabase client initialized", "URL:", CONFIG.SUPABASE_URL);

// Initialize empty postsDatabase array
let postsDatabase = [];

document.addEventListener("DOMContentLoaded", async function() {
    console.log("Vedadabheda Site Loaded");
    console.log("DOM loaded, looking for posts container:", document.getElementById('postContainer'));
    console.log("Post page container:", document.querySelector('.post-page'));
    
    document.fonts.ready.then(function() {
        console.log('All fonts loaded');
    });
    
    // Toggle mobile menu
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
    
    // Load posts data from Supabase
    try {
        console.log("Attempting to fetch posts from Supabase...");
        // Fetch posts from Supabase
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .order('date', { ascending: false });
            
        if (error) {
            console.error("Supabase query error:", error);
            console.error('Error details:', JSON.stringify(error));
            throw error;
        }
        
        // Store posts in the global array
        postsDatabase = data;
        console.log(`Loaded ${postsDatabase.length} posts from Supabase:`, postsDatabase);
        
        // Check if we're on the homepage
        if (document.querySelector('.post-grid') && !document.querySelector('.post-page')) {
            console.log("On homepage, loading posts grid");
            loadPosts();
            setupFilters();
            setupPagination();
            setupSearch();
        }
        
        // Check if we're on a post page
        if (document.querySelector('.post-page')) {
            console.log("On post page, loading single post");
            loadSinglePost();
            setupShareButtons();
        }
        
        // Check if we're on a tag page
        const params = new URLSearchParams(window.location.search);
        if (params.has('tag') && document.getElementById('currentTag')) {
            const tag = params.get('tag');
            console.log(`On tag page for tag: ${tag}`);
            document.getElementById('currentTag').textContent = tag;
            loadTaggedPosts(tag);
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load content. Please try again later.');
    }
});

// Function to load posts to homepage
async function loadPosts(filter = 'all', page = 1, searchTerm = '') {
    console.log(`Loading posts with filter: ${filter}, page: ${page}, search: ${searchTerm}`);
    const postContainer = document.getElementById('postContainer');
    
    if (!postContainer) {
        console.error("Post container not found in DOM");
        return;
    }
    
    // Show loading indicator
    postContainer.innerHTML = '<div class="loading">ಲೇಖನಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...</div>';
    
    try {
        // Prepare filter and search
        let query = supabaseClient.from('posts').select('*');
        console.log(`Building Supabase query with filter: ${filter}`);
        
        // Apply category filter
        if (filter !== 'all') {
            query = query.eq('category', filter);
        }
        
        // Execute the query
        console.log("Executing Supabase query...");
        const { data, error } = await query.order('date', { ascending: false });
        
        if (error) {
            console.error("Query error:", error);
            console.error('Error details:', JSON.stringify(error));
            throw error;
        }
        
        // Update local posts database with fetched data
        postsDatabase = data;
        console.log(`Query returned ${data.length} posts:`, data);
        
        const postsPerPage = 6;
        let filteredPosts = [...postsDatabase];
        
        // Apply search filter client-side (for flexibility)
        if (searchTerm) {
            console.log(`Filtering by search term: ${searchTerm}`);
            filteredPosts = filteredPosts.filter(post => {
                return post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
            });
            console.log(`After search filtering: ${filteredPosts.length} posts`);
        }
        
        // Calculate pagination
        const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
        console.log(`Pagination: ${filteredPosts.length} posts, ${postsPerPage} per page, ${totalPages} total pages`);
        
        const startIndex = (page - 1) * postsPerPage;
        const paginatedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);
        console.log(`Showing page ${page}, posts ${startIndex+1} to ${startIndex+paginatedPosts.length}`);
        
        // Update pagination UI
        const currentPageElement = document.getElementById('currentPage');
        const prevPageButton = document.getElementById('prevPage');
        const nextPageButton = document.getElementById('nextPage');
        
        if (currentPageElement) currentPageElement.textContent = page;
        if (prevPageButton) prevPageButton.disabled = page === 1;
        if (nextPageButton) nextPageButton.disabled = page >= totalPages;
        
        // Clear container
        postContainer.innerHTML = '';
        
        // Generate post items
        if (paginatedPosts.length === 0) {
            console.log("No posts found to display");
            postContainer.innerHTML = '<div class="no-results">ಯಾವುದೇ ಫಲಿತಾಂಶಗಳು ಕಂಡುಬಂದಿಲ್ಲ</div>';
            return;
        }
        
        console.log(`Rendering ${paginatedPosts.length} posts to container`);
        paginatedPosts.forEach(post => {
            const postElement = document.createElement('a');
            postElement.href = `post.html?id=${post.id}`;
            postElement.className = 'post-item';
            
            let categoryLabel = '';
            switch(post.category) {
                case 'islam':
                    categoryLabel = 'ಇಸ್ಲಾಂ';
                    break;
                case 'hindu':
                    categoryLabel = 'ಹಿಂದೂ';
                    break;
                case 'comparative':
                    categoryLabel = 'ತುಲನಾತ್ಮಕ';
                    break;
            }
            
            postElement.innerHTML = `
                <div class="post-img">
                    <img src="${post.image}" alt="${post.title}">
                    <span class="post-category-label ${post.category}">${categoryLabel}</span>
                </div>
                <div class="post-content">
                    <h2 class="post-title">${post.title}</h2>
                    <p class="post-excerpt">${post.excerpt}</p>
                    <div class="post-meta">
                        <span><i class="far fa-calendar-alt"></i> ${post.date}</span>
                        <span><i class="far fa-user"></i> ${post.author}</span>
                    </div>
                </div>
            `;
            
            postContainer.appendChild(postElement);
        });
        console.log("Posts rendered successfully");
        
    } catch (error) {
        console.error('Error loading posts:', error);
        postContainer.innerHTML = '<div class="error">Error loading posts: ' + error.message + '</div>';
    }
}

// Load single post content
async function loadSinglePost() {
    console.log("loadSinglePost() called");
    const params = new URLSearchParams(window.location.search);
    const postId = parseInt(params.get('id'));
    
    console.log(`Looking for post with ID: ${postId}`);
    
    if (!postId) {
        console.warn("No post ID provided, redirecting to homepage");
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Fetch the specific post from Supabase
        console.log(`Fetching post with ID ${postId} from Supabase`);
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
        
        if (error) {
            console.error("Error fetching post:", error);
            console.error('Error details:', JSON.stringify(error));
            throw error;
        }
        
        if (!data) {
            console.warn("Post not found, redirecting to homepage");
            window.location.href = 'index.html';
            return;
        }
        
        const post = data;
        console.log("Post data retrieved:", post);
        
        // Set page title
        document.title = `${post.title} - ವೇದಾಭೇದ`;
        
        // Set post content
        document.getElementById('postTitle').textContent = post.title;
        document.getElementById('postDate').innerHTML = `<i class="far fa-calendar-alt"></i> ${post.date}`;
        document.getElementById('postAuthor').innerHTML = `<i class="far fa-user"></i> ${post.author}`;
        document.getElementById('postImage').src = post.image;
        document.getElementById('postImage').alt = post.title;
        
        // Format content
        if (post.content) {
            console.log("Formatting post content");
            // Convert plain text with line breaks to paragraphs
            const formattedContent = post.content
                .split("\n\n")  // Split on double line breaks
                .filter(para => para.trim() !== '')  // Remove empty paragraphs
                .map(para => {
                    // Check if this paragraph is a quote (starts with ">")
                    if (para.trim().startsWith('>')) {
                        return `<blockquote><p>${para.trim().substring(1).trim()}</p></blockquote>`;
                    }
                    return `<p>${para.trim()}</p>`;
                })
                .join("");
            
            document.getElementById('postBody').innerHTML = formattedContent;
        } else {
            console.warn("Post has no content, displaying excerpt instead");
            document.getElementById('postBody').innerHTML = `<p>${post.excerpt || 'ವಿವರಗಳು ಲಭ್ಯವಿಲ್ಲ'}</p>`;
        }
        
        // Set category
        const categoryElem = document.getElementById('postCategory');
        categoryElem.className = `post-category ${post.category}`;
        
        switch(post.category) {
            case 'islam':
                categoryElem.textContent = 'ಇಸ್ಲಾಂ';
                break;
            case 'hindu':
                categoryElem.textContent = 'ಹಿಂದೂ';
                break;
            case 'comparative':
                categoryElem.textContent = 'ತುಲನಾತ್ಮಕ';
                break;
        }
        
        // Set footnotes
        const footnotesContainer = document.getElementById('footnotes');
        
        if (post.footnotes && post.footnotes.length > 0) {
            console.log(`Setting up ${post.footnotes.length} footnotes`);
            let footnotesList = '<ol>';
            post.footnotes.forEach(note => {
                footnotesList += `<li>${note}</li>`;
            });
            footnotesList += '</ol>';
            footnotesContainer.innerHTML = `<h3>ಉಲ್ಲೇಖಗಳು</h3>${footnotesList}`;
        } else {
            console.log("No footnotes found, hiding section");
            footnotesContainer.style.display = 'none';
        }
        
        // Set tags
        const tagsContainer = document.getElementById('postTags');
        
        if (post.tags && post.tags.length > 0) {
            console.log(`Setting up ${post.tags.length} tags`);
            let tagsHTML = '';
            post.tags.forEach(tag => {
                tagsHTML += `<a href="tag.html?tag=${encodeURIComponent(tag)}">#${tag}</a>`;
            });
            tagsContainer.innerHTML = tagsHTML;
        } else {
            console.log("No tags found, hiding section");
            tagsContainer.style.display = 'none';
        }
        
        // Load related posts and setup navigation
        console.log("Loading related posts and navigation");
        await loadRelatedPosts(post);
        await setupPostNavigation(postId);
        
    } catch (error) {
        console.error('Error loading post:', error);
        document.querySelector('.post-page').innerHTML = `
            <div class="error-message">
                <h2>Error loading post</h2>
                <p>${error.message}</p>
                <a href="index.html">Return to homepage</a>
            </div>
        `;
    }
}

// Load tagged posts
async function loadTaggedPosts(tag, page = 1) {
    console.log(`Loading posts with tag: ${tag}, page: ${page}`);
    const postContainer = document.getElementById('postContainer');
    if (!postContainer) {
        console.error("Post container not found in DOM");
        return;
    }
    
    postContainer.innerHTML = '<div class="loading">ಲೇಖನಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...</div>';
    
    try {
        // Fetch all posts from Supabase (we'll filter by tag client-side)
        console.log("Fetching all posts to filter by tag");
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .order('date', { ascending: false });
        
        if (error) {
            console.error("Supabase query error:", error);
            console.error('Error details:', JSON.stringify(error));
            throw error;
        }
        
        // Store posts in global array and filter by tag
        postsDatabase = data;
        console.log(`Retrieved ${data.length} posts, filtering by tag: ${tag}`);
        
        let taggedPosts = postsDatabase.filter(post => 
            post.tags && post.tags.includes(tag)
        );
        
        console.log(`Found ${taggedPosts.length} posts with tag "${tag}"`);
        
        const postsPerPage = 6;
        
        // Calculate pagination
        let taggedTotalPages = Math.ceil(taggedPosts.length / postsPerPage);
        console.log(`Pagination: ${taggedPosts.length} posts, ${postsPerPage} per page, ${taggedTotalPages} total pages`);
        
        const startIndex = (page - 1) * postsPerPage;
        const paginatedPosts = taggedPosts.slice(startIndex, startIndex + postsPerPage);
        console.log(`Showing page ${page}, posts ${startIndex+1} to ${startIndex+paginatedPosts.length}`);
        
        // Update pagination UI
        const currentPageElement = document.getElementById('currentPage');
        const prevPageButton = document.getElementById('prevPage');
        const nextPageButton = document.getElementById('nextPage');
        
        if (currentPageElement) currentPageElement.textContent = page;
        if (prevPageButton) prevPageButton.disabled = page === 1;
        if (nextPageButton) nextPageButton.disabled = page >= taggedTotalPages;
        
        // Clear container
        postContainer.innerHTML = '';
        
        // Generate post items
        if (paginatedPosts.length === 0) {
            console.log("No posts found with this tag");
            postContainer.innerHTML = '<div class="no-results">ಈ ಟ್ಯಾಗ್‌ನೊಂದಿಗೆ ಯಾವುದೇ ಲೇಖನಗಳು ಕಂಡುಬಂದಿಲ್ಲ</div>';
            return;
        }
        
        console.log(`Rendering ${paginatedPosts.length} tagged posts to container`);
        paginatedPosts.forEach(post => {
            const postElement = document.createElement('a');
            postElement.href = `post.html?id=${post.id}`;
            postElement.className = 'post-item';
            
            let categoryLabel = '';
            switch(post.category) {
                case 'islam':
                    categoryLabel = 'ಇಸ್ಲಾಂ';
                    break;
                case 'hindu':
                    categoryLabel = 'ಹಿಂದೂ';
                    break;
                case 'comparative':
                    categoryLabel = 'ತುಲನಾತ್ಮಕ';
                    break;
            }
            
            postElement.innerHTML = `
                <div class="post-img">
                    <img src="${post.image}" alt="${post.title}">
                    <span class="post-category-label ${post.category}">${categoryLabel}</span>
                </div>
                <div class="post-content">
                    <h2 class="post-title">${post.title}</h2>
                    <p class="post-excerpt">${post.excerpt}</p>
                    <div class="post-meta">
                        <span><i class="far fa-calendar-alt"></i> ${post.date}</span>
                        <span><i class="far fa-user"></i> ${post.author}</span>
                    </div>
                </div>
            `;
            
            postContainer.appendChild(postElement);
        });
        console.log("Tagged posts rendered successfully");
        
    } catch (error) {
        console.error('Error loading tagged posts:', error);
        postContainer.innerHTML = '<div class="error">Error loading posts: ' + error.message + '</div>';
    }
}

// Setup category filters
function setupFilters() {
    console.log("Setting up category filters");
    const filters = document.querySelectorAll('.filter');
    
    filters.forEach(filter => {
        filter.addEventListener('click', function() {
            console.log(`Filter clicked: ${this.getAttribute('data-filter')}`);
            // Remove active class from all filters
            filters.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked filter
            this.classList.add('active');
            
            // Get filter category
            const filterCategory = this.getAttribute('data-filter');
            
            // Load posts with selected filter
            loadPosts(filterCategory, 1);
        });
    });
    
    // Nav menu category links
    const categoryLinks = document.querySelectorAll('.category');
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.getAttribute('data-category');
            console.log(`Category menu link clicked: ${category}`);
            
            // Update filter buttons
            filters.forEach(f => {
                if (f.getAttribute('data-filter') === category) {
                    f.click();
                }
            });
            
            // Close mobile menu if open
            const navMenu = document.querySelector('.nav-menu');
            navMenu.classList.remove('active');
            
            // Scroll to post section
            document.querySelector('.category-filters').scrollIntoView({behavior: 'smooth'});
        });
    });
}

// Setup pagination
function setupPagination() {
    console.log("Setting up pagination");
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (!prevBtn || !nextBtn) {
        console.warn("Pagination buttons not found");
        return;
    }
    
    prevBtn.addEventListener('click', function() {
        const currentPage = parseInt(document.getElementById('currentPage').textContent);
        console.log(`Previous page clicked, current page: ${currentPage}`);
        if (currentPage > 1) {
            const activeFilter = document.querySelector('.filter.active');
            const filterCategory = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
            const searchInput = document.getElementById('searchInput');
            const searchTerm = searchInput ? searchInput.value : '';
            
            loadPosts(filterCategory, currentPage - 1, searchTerm);
        }
    });
    
    nextBtn.addEventListener('click', function() {
        const currentPage = parseInt(document.getElementById('currentPage').textContent);
        console.log(`Next page clicked, current page: ${currentPage}`);
        const activeFilter = document.querySelector('.filter.active');
        const filterCategory = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput ? searchInput.value : '';
        
        loadPosts(filterCategory, currentPage + 1, searchTerm);
    });
}

// Setup search functionality
function setupSearch() {
    console.log("Setting up search functionality");
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    
    if (!searchInput || !searchButton) {
        console.warn("Search elements not found");
        return;
    }
    
    // Search on button click
    searchButton.addEventListener('click', function() {
        const searchTerm = searchInput.value.trim();
        console.log(`Search button clicked, term: "${searchTerm}"`);
        const activeFilter = document.querySelector('.filter.active');
        const filterCategory = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        
        loadPosts(filterCategory, 1, searchTerm);
    });
    
    // Search on Enter key press
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = searchInput.value.trim();
            console.log(`Search Enter pressed, term: "${searchTerm}"`);
            const activeFilter = document.querySelector('.filter.active');
            const filterCategory = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
            
            loadPosts(filterCategory, 1, searchTerm);
        }
    });
}

// Load related posts based on category and tags
async function loadRelatedPosts(currentPost) {
    console.log(`Loading related posts for post ID: ${currentPost.id}`);
    const relatedPostsContainer = document.getElementById('relatedPosts');
    if (!relatedPostsContainer) {
        console.warn("Related posts container not found");
        return;
    }
    
    try {
        // Fetch all posts from Supabase (for filtering related posts)
        if (postsDatabase.length === 0) {
            console.log("Fetching all posts for related posts filtering");
            const { data, error } = await supabaseClient
                .from('posts')
                .select('*');
            
            if (error) {
                console.error("Supabase query error:", error);
                throw error;
            }
            postsDatabase = data;
            console.log(`Retrieved ${data.length} posts for related posts filtering`);
        }
        
        // Find posts with same category or shared tags
        console.log("Filtering posts by category and tags");
        let relatedPosts = postsDatabase.filter(post => {
            if (post.id === currentPost.id) return false; // Exclude current post
            
            // Same category
            if (post.category === currentPost.category) return true;
            
            // Shared tags
            if (currentPost.tags && post.tags) {
                for (let tag of currentPost.tags) {
                    if (post.tags.includes(tag)) return true;
                }
            }
            
            return false;
        });
        
        // Limit to 3 related posts
        relatedPosts = relatedPosts.slice(0, 3);
        console.log(`Found ${relatedPosts.length} related posts`);
        
        if (relatedPosts.length === 0) {
            console.log("No related posts found, hiding section");
            const relatedSection = document.querySelector('.related-posts');
            if (relatedSection) {
                relatedSection.style.display = 'none';
            }
            return;
        }
        
        // Generate related posts HTML
        relatedPostsContainer.innerHTML = '';
        
        console.log("Rendering related posts");
        relatedPosts.forEach(post => {
            const postElement = document.createElement('a');
            postElement.href = `post.html?id=${post.id}`;
            postElement.className = 'post-item';
            
            let categoryLabel = '';
            switch(post.category) {
                case 'islam':
                    categoryLabel = 'ಇಸ್ಲಾಂ';
                    break;
                case 'hindu':
                    categoryLabel = 'ಹಿಂದೂ';
                    break;
                case 'comparative':
                    categoryLabel = 'ತುಲನಾತ್ಮಕ';
                    break;
            }
            
            postElement.innerHTML = `
                <div class="post-img">
                    <img src="${post.image}" alt="${post.title}">
                    <span class="post-category-label ${post.category}">${categoryLabel}</span>
                </div>
                <div class="post-content">
                    <h3 class="post-title">${post.title}</h3>
                </div>
            `;
            
            relatedPostsContainer.appendChild(postElement);
        });
        console.log("Related posts rendered successfully");
        
    } catch (error) {
        console.error('Error loading related posts:', error);
        console.error('Error details:', JSON.stringify(error));
        const relatedSection = document.querySelector('.related-posts');
        if (relatedSection) {
            relatedSection.style.display = 'none';
        }
    }
}

// Setup post navigation (previous/next)
async function setupPostNavigation(currentPostId) {
    console.log(`Setting up post navigation for post ID: ${currentPostId}`);
    const prevPostLink = document.getElementById('prevPost');
    const nextPostLink = document.getElementById('nextPost');
    
    if (!prevPostLink || !nextPostLink) {
        console.warn("Post navigation links not found");
        return;
    }
    
    try {
        // Make sure we have all posts for navigation
        if (postsDatabase.length === 0) {
            console.log("Fetching all posts for post navigation");
            const { data, error } = await supabaseClient
                .from('posts')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) {
                console.error("Supabase query error:", error);
                throw error;
            }
            postsDatabase = data;
            console.log(`Retrieved ${data.length} posts for navigation`);
        }
        
        // Find current post index
        const currentPostIndex = postsDatabase.findIndex(post => post.id === currentPostId);
        console.log(`Current post index: ${currentPostIndex} of ${postsDatabase.length}`);
        
        // Previous post
        if (currentPostIndex > 0) {
            const prevPost = postsDatabase[currentPostIndex - 1];
            console.log(`Previous post: ID ${prevPost.id}, Title: ${prevPost.title}`);
            prevPostLink.href = `post.html?id=${prevPost.id}`;
            prevPostLink.innerHTML = `<i class="fas fa-arrow-left"></i> ${prevPost.title.substring(0, 30)}${prevPost.title.length > 30 ? '...' : ''}`;
        } else {
            console.log("No previous post available");
            prevPostLink.style.display = 'none';
        }
        
        // Next post
        if (currentPostIndex < postsDatabase.length - 1) {
            const nextPost = postsDatabase[currentPostIndex + 1];
            console.log(`Next post: ID ${nextPost.id}, Title: ${nextPost.title}`);
            nextPostLink.href = `post.html?id=${nextPost.id}`;
            nextPostLink.innerHTML = `${nextPost.title.substring(0, 30)}${nextPost.title.length > 30 ? '...' : ''} <i class="fas fa-arrow-right"></i>`;
        } else {
            console.log("No next post available");
            nextPostLink.style.display = 'none';
        }
    } catch (error) {
        console.error('Error setting up post navigation:', error);
        console.error('Error details:', JSON.stringify(error));
        prevPostLink.style.display = 'none';
        nextPostLink.style.display = 'none';
    }
}

// Setup share buttons
function setupShareButtons() {
    console.log("Setting up share buttons");
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.querySelector('#postTitle') ? document.querySelector('#postTitle').textContent : document.title);
    
    const facebookShare = document.querySelector('.share-btn.facebook');
    const twitterShare = document.querySelector('.share-btn.twitter');
    const whatsappShare = document.querySelector('.share-btn.whatsapp');
    const telegramShare = document.querySelector('.share-btn.telegram');
    if (facebookShare) {
        facebookShare.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        facebookShare.target = '_blank';
        console.log("Facebook share link set up");
    }
    
    if (twitterShare) {
        twitterShare.href = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
        twitterShare.target = '_blank';
        console.log("Twitter share link set up");
    }
    
    if (whatsappShare) {
        whatsappShare.href = `https://api.whatsapp.com/send?text=${title}%20${url}`;
        whatsappShare.target = '_blank';
        console.log("WhatsApp share link set up");
    }
    
    if (telegramShare) {
        telegramShare.href = `https://t.me/share/url?url=${url}&text=${title}`;
        telegramShare.target = '_blank';
        console.log("Telegram share link set up");
    }
}

// Handle loading errors
function showError(message) {
    console.error(`Displaying error message: ${message}`);
    const errorBox = document.createElement('div');
    errorBox.className = 'error-message';
    errorBox.textContent = message;
    document.body.prepend(errorBox);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        console.log("Hiding error message");
        errorBox.style.opacity = '0';
        setTimeout(() => errorBox.remove(), 1000);
    }, 5000);
}