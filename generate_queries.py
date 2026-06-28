import random

categories = {
    "general": ["capital of", "who invented", "history of", "define", "meaning of"],
    "entertainment": ["latest album", "best movies", "top netflix shows", "celebrity news", "concert tickets"],
    "shopping": ["cheap", "best", "reviews of", "under 500", "discount"],
    "food": ["near me", "easy recipes", "healthy meals", "best restaurants", "street food"],
    "tech": ["how to fix", "tutorial", "examples", "download", "update"],
    "sports": ["score", "highlights", "stats", "schedule", "ranking"],
    "travel": ["flights to", "hotels in", "things to do in", "best places", "visa requirements"]
}

topics = [
    "Paris", "Python", "NBA", "Cristiano Ronaldo", "iPhone", "Windows 10",
    "Drake", "Netflix", "pizza", "Tokyo", "Malaysia", "AI", "TikTok",
    "Spotify", "Instagram", "YouTube", "Reddit", "LinkedIn", "Snapchat"
]

queries = []
for i in range(1000):
    cat = random.choice(list(categories.keys()))
    phrase = random.choice(categories[cat])
    topic = random.choice(topics)
    queries.append(f"{phrase} {topic}")

# Save to file
with open("search_queries.txt", "w") as f:
    for q in queries:
        f.write(q + "\n")

print("Generated 1000+ search queries!")
