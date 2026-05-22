const axios = require('axios');
const webPush = require('web-push');

const { sendEmail } = require('../utils/email');

const Notification = require('../models/notificationModel');
const User = require('../models/userModel');

// ======================================
// CATEGORIES
// ======================================

const categories = [
  'Politics',
  'Sports',
  'Technology',
  'Business',
  'Entertainment',
  'Health',
  'Science',
];

// ======================================
// GET CATEGORIES
// ======================================

exports.getCategories = async (
  req,
  res
) => {
  res.json(categories);
};

// ======================================
// PROVIDER
// ======================================

const getProvider = () => {

  if (process.env.NEWS_API_KEY) {
    return 'newsapi';
  }

  if (process.env.GNEWS_API_KEY) {
    return 'gnews';
  }

  return null;
};

// ======================================
// DEMO ARTICLES
// ======================================

const demoArticles = [
  {
    title:
      'AI-driven news alert system launches',
    description:
      'Modern news platform with live alerts.',
    url:
      'https://example.com/demo',
    source: {
      name: 'Demo News',
    },
    publishedAt:
      new Date().toISOString(),
    category:
      'Technology',
    urlToImage:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  },
];

// ======================================
// FETCH CATEGORY ARTICLES
// ======================================

const fetchArticlesForCategory =
  async (
    category,
    provider
  ) => {

    try {

      if (!provider) {
        return [];
      }

      const value =
        encodeURIComponent(
          category.toLowerCase()
        );

      const endpoint =
        provider === 'newsapi'
          ? `https://newsapi.org/v2/top-headlines?language=en&pageSize=10&category=${value}&apiKey=${process.env.NEWS_API_KEY}`
          : `https://gnews.io/api/v4/top-headlines?lang=en&max=10&topic=${value}&token=${process.env.GNEWS_API_KEY}`;

      const response =
        await axios.get(
          endpoint
        );

      const rawArticles =
        response.data.articles ||
        response.data.results ||
        [];

      return rawArticles.map(
        (article) => ({
          ...article,
          category,
        })
      );

    } catch (error) {

      console.log(
        `❌ ${category} fetch failed:`,
        error.message
      );

      return [];
    }
  };

// ======================================
// GET NEWS
// ======================================

exports.getNews = async (
  req,
  res
) => {

  try {

    const provider =
      getProvider();

    if (!provider) {

      return res.json({
        articles:
          demoArticles,
        categories,
      });
    }

    const category =
      req.query.category ||
      'Technology';

    const articles =
      await fetchArticlesForCategory(
        category,
        provider
      );

    res.json({
      articles,
      categories,
    });

  } catch (error) {

    console.error(
      'News fetch error:',
      error.message
    );

    res.status(500).json({
      message:
        'Failed to fetch news',
    });
  }
};

// ======================================
// GET PREFERENCES
// ======================================

exports.getPreferences =
  async (
    req,
    res,
    next
  ) => {

    try {

      const user =
        await User.findById(
          req.user._id
        ).select(
          'preferences'
        );

      res.json(
        user.preferences
      );

    } catch (error) {

      next(error);
    }
  };

// ======================================
// SAVE PREFERENCES
// ======================================

exports.subscribeCategories =
  async (
    req,
    res,
    next
  ) => {

    try {

      const {
        preferences,
      } = req.body;

      const user =
        await User.findById(
          req.user._id
        );

      user.preferences = {
        ...user.preferences,
        ...preferences,
      };

      await user.save();

      res.json({
        preferences:
          user.preferences,
      });

    } catch (error) {

      next(error);
    }
  };

// ======================================
// NOTIFY USERS
// ======================================

const notifyUsers =
  async (
    io,
    articles = []
  ) => {

    try {

      const users =
        await User.find({}).select(
          '+lastNotificationSentAt'
        );

      const notifications =
        [];

      const now =
        new Date();

      for (const user of users) {

        const notificationType =
          String(
            user.preferences
              ?.notificationType ||
              'email'
          ).toLowerCase();

        const frequency =
          String(
            user.preferences
              ?.frequency ||
              'immediate'
          ).toLowerCase();

        const sendPush =
          ['push', 'both']
            .includes(
              notificationType
            );

        const shouldSendEmail =
          ['email', 'both']
            .includes(
              notificationType
            );

        // ======================
        // FREQUENCY CHECK
        // ======================

        let shouldNotify =
          true;

        const lastTime =
          user.lastNotificationSentAt
            ? new Date(
                user.lastNotificationSentAt
              )
            : null;

        if (lastTime) {

          const diffMinutes =
            (now - lastTime) /
            (1000 * 60);

          const diffHours =
            diffMinutes / 60;

          if (
            frequency ===
            'hourly'
          ) {

            shouldNotify =
              diffMinutes >= 60;

          } else if (
            frequency ===
            'daily'
          ) {

            shouldNotify =
              diffHours >= 24;
          }
        }

        if (!shouldNotify) {
          continue;
        }

        // ======================
        // FILTER ARTICLES
        // ======================

        const filtered =
          articles.filter(
            (article) => {

              const matchesCategory =
                user.preferences
                  ?.categories
                  ?.length === 0 ||
                user.preferences.categories.includes(
                  article.category
                );

              const breakingCheck =
                !user.preferences
                  ?.breakingOnly ||
                article.title
                  ?.toLowerCase()
                  .includes(
                    'breaking'
                  );

              return (
                matchesCategory &&
                breakingCheck
              );
            }
          );

        if (
          !filtered.length
        ) {
          continue;
        }

        const article =
          filtered[0];

        const payload = {
          title:
            article.title,
          description:
            article.description,
          url:
            article.url,
          category:
            article.category,
        };

        // ======================
        // SOCKET ALERTS
        // ======================

        if (io) {

          io.emit(
            'newsAlert',
            payload
          );

          io.emit(
            'newsUpdate',
            articles
          );
        }

        // ======================
        // PUSH
        // ======================

        if (
          sendPush &&
          user.pushSubscription
        ) {

          try {

            await webPush.sendNotification(
              user.pushSubscription,
              JSON.stringify(
                payload
              )
            );

            console.log(
              `📲 Push sent to ${user.email}`
            );

          } catch (err) {

            console.log(
              'Push Error:',
              err.message
            );
          }
        }

        // ======================
        // EMAIL
        // ======================

        if (
          shouldSendEmail
        ) {

          try {

            await sendEmail({
              email:
                user.email,

              subject:
                `🔥 ${article.category} News Alert`,

              html: `
                <div style="font-family:Arial;padding:20px;background:#0f172a;color:white;">
                  
                  <h1 style="color:#38bdf8;">
                    ${article.category}
                  </h1>

                  <h2>
                    ${article.title}
                  </h2>

                  <p>
                    ${
                      article.description ||
                      'Latest breaking update.'
                    }
                  </p>

                  <a 
                    href="${article.url}"
                    style="
                      display:inline-block;
                      margin-top:20px;
                      background:#0ea5e9;
                      color:white;
                      padding:12px 18px;
                      border-radius:10px;
                      text-decoration:none;
                    "
                  >
                    Read Full Article
                  </a>

                </div>
              `,
            });

            console.log(
              `📧 Email sent to ${user.email}`
            );

          } catch (err) {

            console.log(
              'Email Error:',
              err.message
            );
          }
        }

        notifications.push({
          user:
            user._id,
          type:
            notificationType,
          category:
            article.category,
          title:
            article.title,
          url:
            article.url,
          message:
            article.description,
        });

        await User.findByIdAndUpdate(
          user._id,
          {
            lastNotificationSentAt:
              now,
          }
        );
      }

      if (
        notifications.length
      ) {

        await Notification.insertMany(
          notifications
        );
      }

    } catch (error) {

      console.log(
        'Notify Error:',
        error.message
      );
    }
  };

// ======================================
// NEWS POLLING
// ======================================

let pollingStarted =
  false;

exports.scheduleNewsPolling =
  (io) => {

    if (
      pollingStarted
    ) {

      console.log(
        '⚠️ Polling already running'
      );

      return;
    }

    pollingStarted =
      true;

    console.log(
      '✅ News polling started'
    );

    const fetchAndDispatch =
      async () => {

        try {

          const provider =
            getProvider();

          let articles =
            [];

          // ======================
          // FETCH NEWS
          // ======================

          if (
            !provider
          ) {

            articles =
              demoArticles;

          } else {

            const allArticles =
              [];

            for (const category of categories) {

              const categoryArticles =
                await fetchArticlesForCategory(
                  category,
                  provider
                );

              allArticles.push(
                ...categoryArticles
              );
            }

            articles =
              allArticles;
          }

          // ======================
          // SEND ALERTS
          // ======================

          await notifyUsers(
            io,
            articles
          );

          // ======================
          // LIVE UPDATE
          // ======================

          if (io) {

            io.emit(
              'newsUpdate',
              articles
            );

            console.log(
              `📡 ${articles.length} articles emitted`
            );
          }

        } catch (error) {

          console.error(
            '❌ Polling failed:',
            error.message
          );
        }
      };

    // FIRST RUN
    fetchAndDispatch();

    // INTERVAL
    const intervalMinutes =
      Number(
        process.env
          .NOTIFICATION_POLL_INTERVAL_MINUTES ||
          1
      );

    const intervalMs =
      intervalMinutes *
      60 *
      1000;

    console.log(
      `⏱️ Polling every ${intervalMinutes} minute(s)`
    );

    setInterval(
      fetchAndDispatch,
      intervalMs
    );
  };