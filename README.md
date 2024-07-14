# golang-to-gui-converter

Convert my golang code to have a beautiful interactive gui.
package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type Response struct {
	StatusCode int
	Body       Body
}

type Body struct {
	Items []Item
}

type Item struct {
	ItemID              float64 `json:"item_id"`
	Title               string  `json:"title_en"`
	Price               float64 `json:"price"`
	AccountCountry      string  `json:"account_country"`
	ItemOrigin          string  `json:"item_origin"`
	PublishedDate       int64   `json:"published_date"`
	LastAccountActivity int64   `json:"account_last_activity"`
	ExtendedGuarantee   int     `json:"extended_guarantee"`
	AccountFullGames    struct {
		List map[string]struct {
			AppID           int     `json:"appid"`
			PlaytimeForever float64 `json:"playtime_forever"`
			InternalGameID  int     `json:"internal_game_id"`
			Abbr            string  `json:"abbr"`
			Title           string  `json:"title"`
			ParentGameID    int     `json:"parentGameId"`
			Img             string  `json:"img"`
		} `json:"list"`
	} `json:"account_full_games"`
}

func getGuaranteePeriod(value int) string {
	switch value {
	case -1:
		return "12 hours"
	case 0:
		return "24 hours"
	case 1:
		return "3 days"
	default:
		return "Unknown"
	}
}

func getMaxWidths(items []Item) map[string]int {
	maxWidths := make(map[string]int)
	maxWidths["Link"] = 30
	maxWidths["Title"] = 30
	maxWidths["Price"] = 6
	maxWidths["Origin"] = 8
	maxWidths["Country"] = 15
	maxWidths["Published"] = 12
	maxWidths["LastActivity"] = 15
	maxWidths["Guarantee"] = 10
	maxWidths["Hours"] = 6

	for _, item := range items {
		maxWidths["Link"] = max(maxWidths["Link"], len(fmt.Sprintf("https://lzt.market/%.0f", item.ItemID)))
		maxWidths["Title"] = max(maxWidths["Title"], len(truncateString(item.Title, 30)))
		maxWidths["Price"] = max(maxWidths["Price"], len(fmt.Sprintf("%.2f", item.Price)))
		maxWidths["Origin"] = max(maxWidths["Origin"], len(item.ItemOrigin))
		maxWidths["Country"] = max(maxWidths["Country"], len(truncateString(item.AccountCountry, 15)))
		maxWidths["Published"] = max(maxWidths["Published"], len(time.Unix(item.PublishedDate, 0).Format("Jan 02, 2006")))
		maxWidths["LastActivity"] = max(maxWidths["LastActivity"], len(time.Unix(item.LastAccountActivity, 0).Format("Jan 02, 2006")))
		maxWidths["Guarantee"] = max(maxWidths["Guarantee"], len(getGuaranteePeriod(item.ExtendedGuarantee)))
		maxWidths["Hours"] = max(maxWidths["Hours"], len(fmt.Sprintf("%.2f", item.AccountFullGames.List["252490"].PlaytimeForever)))
	}
	return maxWidths
}

func generateSeparator(maxWidths map[string]int) string {
	parts := []string{}
	for _, column := range []string{"Link", "Title", "Price", "Origin", "Country", "Published", "LastActivity", "Guarantee", "Hours"} {
		parts = append(parts, strings.Repeat("-", maxWidths[column]+2))
	}
	return "+" + strings.Join(parts, "+") + "+"
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func main() {
	seenItems := make(map[float64]bool)
	var mutex sync.Mutex

	numWorkers := 4
	itemsChan := make(chan []Item, numWorkers)

	var wg sync.WaitGroup
	wg.Add(numWorkers)

	for i := 0; i < numWorkers; i++ {
		go func() {
			defer wg.Done()
			for items := range itemsChan {
				newItems := make([]Item, 0)
				mutex.Lock()
				for _, item := range items {
					if !seenItems[item.ItemID] {
						seenItems[item.ItemID] = true
						newItems = append(newItems, item)
					}
				}
				mutex.Unlock()

				if len(newItems) > 0 {
					clearScreen()

					maxWidths := getMaxWidths(newItems)
					separator := generateSeparator(maxWidths)

					fmt.Println(time.Now().Format("Jan 02, 2006 15:04:05"))
					fmt.Println("Steam Items")
					fmt.Println(separator)

					headerFormat := "| \033[1;36m%-*s\033[0m | \033[1;36m%-*s\033[0m | \033[1;36m%*s\033[0m | \033[1;36m%-*s\033[0m | \033[1;36m%-*s\033[0m | \033[1;36m%-*s\033[0m | \033[1;36m%-*s\033[0m | \033[1;36m%-*s\033[0m | \033[1;36m%*s\033[0m |\n"
					fmt.Printf(headerFormat, maxWidths["Link"], "Link", maxWidths["Title"], "Title", maxWidths["Price"], "Price", maxWidths["Origin"], "Origin", maxWidths["Country"], "Country", maxWidths["Published"], "Published", maxWidths["LastActivity"], "Last Activity", maxWidths["Guarantee"], "Guarantee", maxWidths["Hours"], "Hours")

					fmt.Println(separator)

					itemFormat := "| %-*s | %-*s | %*.2f | %-*s | %-*s | %-*s | %-*s | %-*s | %*.2f |\n"
					for _, item := range newItems {
						truncatedCountry := truncateString(item.AccountCountry, maxWidths["Country"])
						truncatedTitle := truncateString(item.Title, maxWidths["Title"])
						publishedDate := time.Unix(item.PublishedDate, 0).Format("Jan 02, 2006")
						lastAccountActivity := time.Unix(item.LastAccountActivity, 0).Format("Jan 02, 2006")
						link := fmt.Sprintf("https://lzt.market/%.0f", item.ItemID)
						guarantee := getGuaranteePeriod(item.ExtendedGuarantee)
						rust := item.AccountFullGames.List["252490"]
						fmt.Printf(itemFormat, maxWidths["Link"], link, maxWidths["Title"], truncatedTitle, maxWidths["Price"], item.Price, maxWidths["Origin"], item.ItemOrigin, maxWidths["Country"], truncatedCountry, maxWidths["Published"], publishedDate, maxWidths["LastActivity"], lastAccountActivity, maxWidths["Guarantee"], guarantee, maxWidths["Hours"], rust.PlaytimeForever)
					}

					fmt.Println(separator)
				}

			}
		}()
	}

	for {
		items, err := fetchItems()
		if err != nil {
			fmt.Println(err)
			time.Sleep(3 * time.Second)
			continue
		}

		itemsChan <- items
		time.Sleep(3 * time.Second)

	}
	close(itemsChan)
	wg.Wait()
}

func truncateString(s string, maxLength int) string {
	if len(s) > maxLength {
		return s[:maxLength-3] + "..." // truncate the string and add an ellipsis
	}
	return s
}

func clearScreen() {
	cmd := exec.Command("clear")
	cmd.Stdout = os.Stdout
	cmd.Run()
}

func fetchItems() ([]Item, error) {
	url := "https://api.lzt.market/steam"

	query := make(map[string]string)
	//query["currency"] = "usd"
	query["game[]"] = "252490"
	query["pmin"] = "1000"
	query["pmax"] = "2500"
	query["order_by"] = "price_to_up"
	query["hours_played[252490]"] = "250"
	query["daybreak"] = "7"
	query["not_country[]"] = "United States"
	query["mafile"] = "no"
	query["limit"] = "no"
	query["trade_ban"] = "no"

	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	token := "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJzdWIiOjI0OTc5OTUsImlzcyI6Imx6dCIsImV4cCI6MCwiaWF0IjoxNzE0MTgwMDA4LCJqdGkiOjU1NzQ3OCwic2NvcGUiOiJiYXNpYyByZWFkIHBvc3QgY29udmVyc2F0ZSBtYXJrZXQifQ.evWUpjExi01yNqsKdaOyF27IgVfArJ0jU40ub1Q8WAvj7WmrpjnEsLTDrM0DqY9SfeZoqS0Wh9hlrl1ezXL6JYOZysrhj_M-uXVm3I-xngnyHGfMIY_6qKGB3-jwaNpOEUhts9tONorBwj32OWfXudH6FFq0TapqkcDd4gxNxxM"
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	q := req.URL.Query()
	for k, v := range query {
		q.Add(k, v)
	}
	req.URL.RawQuery = q.Encode()

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var response Response
	response.StatusCode = resp.StatusCode
	err = json.Unmarshal(body, &response.Body)
	if err != nil {
		return nil, err
	}

	return response.Body.Items, nil

}


## Collaborate with GPT Engineer

This is a [gptengineer.app](https://gptengineer.app)-synced repository 🌟🤖

Changes made via gptengineer.app will be committed to this repo.

If you clone this repo and push changes, you will have them reflected in the GPT Engineer UI.

## Tech stack

This project is built with .

- Vite
- React
- shadcn-ui
- Tailwind CSS

## Setup

```sh
git clone https://github.com/GPT-Engineer-App/golang-to-gui-converter.git
cd golang-to-gui-converter
npm i
```

```sh
npm run dev
```

This will run a dev server with auto reloading and an instant preview.

## Requirements

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
