// screens/QuestionnaireScreen.js
import React, { useState, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  Button, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Switch,
  PanResponder
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const TOTAL_PAGES = 12;

const BOTTLENECK_OPTIONS = ['Scripting', 'Editing', 'Staying Consistent'];
const NICHE_OPTIONS = [
  'Venture Capital',
  'Startups/Build in Public',
  'Fitness',
  'Lifestyle/Vlogs',
  'Business/Entrepreneurship',
  'Career Advice',
  'Tech/Product Reviews',
  'Cooking/Food',
  'Language Learning',
  'Dating/Relationships',
  'Travel',
  'Real Estate',
  'Other'
];
const ANGLE_OPTIONS = ['Educational', 'Entertaining', 'Inspirational', 'Other'];
const PLATFORM_OPTIONS = ['LinkedIn', 'X', 'Instagram', 'TikTok', 'YouTube', 'Facebook'];

const getPlatformIcon = (platform) => {
  switch (platform) {
    case 'LinkedIn':
      return 'in';
    case 'X':
      return 'X';
    case 'Instagram':
      return '◉';
    case 'TikTok':
      return '♪';
    case 'YouTube':
      return '▶';
    case 'Facebook':
      return 'f';
    default:
      return '';
  }
};

const Slider = ({ value, min, max, onValueChange, label, formatValue }) => {
  const trackRef = useRef(null);
  const onValueChangeRef = useRef(onValueChange);
  const minRef = useRef(min);
  const maxRef = useRef(max);

  // Mettre à jour les refs quand les valeurs changent
  onValueChangeRef.current = onValueChange;
  minRef.current = min;
  maxRef.current = max;

  const percentage = ((value - min) / (max - min)) * 100;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (trackRef.current) {
            trackRef.current.measure((x, y, width, height, pageX, pageY) => {
              const touchX = evt.nativeEvent.pageX;
              const newX = touchX - pageX;
              const clampedX = Math.max(0, Math.min(width, newX));
              const newPercentage = (clampedX / width) * 100;
              const newValue = minRef.current + (newPercentage / 100) * (maxRef.current - minRef.current);
              const roundedValue = Math.round(newValue);
              onValueChangeRef.current(Math.max(minRef.current, Math.min(maxRef.current, roundedValue)));
            });
          }
        },
        onPanResponderMove: (evt) => {
          if (trackRef.current) {
            trackRef.current.measure((x, y, width, height, pageX, pageY) => {
              const touchX = evt.nativeEvent.pageX;
              const newX = touchX - pageX;
              const clampedX = Math.max(0, Math.min(width, newX));
              const newPercentage = (clampedX / width) * 100;
              const newValue = minRef.current + (newPercentage / 100) * (maxRef.current - minRef.current);
              const roundedValue = Math.round(newValue);
              onValueChangeRef.current(Math.max(minRef.current, Math.min(maxRef.current, roundedValue)));
            });
          }
        },
      }),
    [] // Pas de dépendances, on utilise des refs
  );

  return (
    <View style={styles.sliderContainer}>
      <Text style={styles.sliderLabel}>
        {label}: {formatValue ? formatValue(value) : value.toLocaleString()}
      </Text>
      <View style={styles.sliderRow}>
        <Text style={styles.sliderMin}>{formatValue ? formatValue(min) : min.toLocaleString()}</Text>
        <View
          ref={trackRef}
          style={styles.sliderTrack}
          {...panResponder.panHandlers}
        >
          <View style={[styles.sliderFill, { width: `${percentage}%` }]} />
          <View
            style={[
              styles.sliderThumb,
              { left: `${percentage}%`, marginLeft: -8 }
            ]}
            {...panResponder.panHandlers}
          />
        </View>
        <Text style={styles.sliderMax}>{formatValue ? formatValue(max) : max.toLocaleString()}</Text>
      </View>
    </View>
  );
};

export default function QuestionnaireScreen() {
  const navigation = useNavigation();

  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState({
    contentMotivation: {
      trueReason: '',
      tellOthers: '',
      gap: ''
    },
    bottleneck: '',
    bottleneckDeepDive: '',
    authentication: {
      linkedin: false,
      twitter: false,
      gmail: false
    },
    niche: '',
    angle: '',
    creatorResearch: '',
    audienceDefinition: '',
    platformPreferences: [],
    platformUsage: [],
    goals: {
      followers: 0,
      views: 0,
      subscribers: 0
    }
  });

  const handleNext = () => {
    if (currentPage === TOTAL_PAGES - 1) {
      console.log('Questionnaire answers:', answers);
      navigation.replace('Main');
      return;
    }
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (currentPage === 0) return;
    setCurrentPage((prev) => prev - 1);
  };

  const isPageValid = () => {
    switch (currentPage) {
      case 0: // Welcome - always valid
        return true;
      case 1: // Content Motivation
        return answers.contentMotivation.trueReason.trim() && 
               answers.contentMotivation.tellOthers.trim() && 
               answers.contentMotivation.gap.trim();
      case 2: // Bottleneck
        return answers.bottleneck !== '';
      case 3: // Bottleneck Deep Dive
        return answers.bottleneckDeepDive.trim() !== '';
      case 4: // Authentication - always valid (can skip)
        return true;
      case 5: // Niche
        return answers.niche !== '';
      case 6: // Angle
        return answers.angle !== '';
      case 7: // Creator Research
        return answers.creatorResearch.trim() !== '';
      case 8: // Audience Definition
        return answers.audienceDefinition.trim() !== '';
      case 9: // Platform Preferences
        return answers.platformPreferences.length > 0;
      case 10: // Platform Usage
        return answers.platformUsage.length > 0;
      case 11: // Goal Setting
        return true; // Goals are optional
      default:
        return true;
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 0:
        return (
          <View style={styles.welcomeContainer}>
            <View style={styles.iconsContainer}>
              <View style={styles.starsIcon}>
                <View style={[styles.star, styles.star1]} />
                <View style={[styles.star, styles.star2]} />
                <View style={[styles.star, styles.star3]} />
              </View>
              <View style={styles.barsIcon}>
                <View style={[styles.bar, styles.bar1]} />
                <View style={[styles.bar, styles.bar2]} />
                <View style={[styles.bar, styles.bar3]} />
                <View style={[styles.bar, styles.bar4]} />
              </View>
            </View>
            <Text style={styles.brandName}>compound</Text>
            <Text style={styles.welcomeTitle}>It all starts with one post</Text>
          </View>
        );

      case 1:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Why do you want to post content?</Text>
            <Text style={styles.subtitle}>(be honest)</Text>
            
            <Text style={styles.label}>My TRUE reason for building a personal brand:</Text>
            <TextInput
              style={styles.textArea}
              value={answers.contentMotivation.trueReason}
              onChangeText={(text) => setAnswers({
                ...answers,
                contentMotivation: { ...answers.contentMotivation, trueReason: text }
              })}
              placeholder="Your honest answer"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>What I tell people my reason is:</Text>
            <TextInput
              style={styles.textArea}
              value={answers.contentMotivation.tellOthers}
              onChangeText={(text) => setAnswers({
                ...answers,
                contentMotivation: { ...answers.contentMotivation, tellOthers: text }
              })}
              placeholder="What you'd say publicly"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>The gap between these two (if any):</Text>
            <TextInput
              style={styles.textArea}
              value={answers.contentMotivation.gap}
              onChangeText={(text) => setAnswers({
                ...answers,
                contentMotivation: { ...answers.contentMotivation, gap: text }
              })}
              placeholder="Describe the gap"
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>What's your biggest bottleneck?</Text>
            {BOTTLENECK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  answers.bottleneck === option && styles.optionButtonSelected
                ]}
                onPress={() => setAnswers({ ...answers, bottleneck: option })}
              >
                <Text style={[
                  styles.optionText,
                  answers.bottleneck === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 3:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Why haven't you solved it?</Text>
            <TextInput
              style={styles.textArea}
              value={answers.bottleneckDeepDive}
              onChangeText={(text) => setAnswers({ ...answers, bottleneckDeepDive: text })}
              placeholder="Be honest about what's holding you back"
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
            />
          </View>
        );

      case 4:
        return (
          <View style={styles.pageContainer}>
            <View style={styles.profileIconContainer}>
              <View style={styles.profileIcon}>
                <View style={styles.profileIconHead} />
                <View style={styles.profileIconBody} />
              </View>
            </View>
            <Text style={styles.pageTitle}>Who are you?</Text>
            <Text style={styles.subtitle}>Connect with one of your accounts</Text>
            
            <TouchableOpacity
              style={styles.authButtonLinkedIn}
              onPress={() => {
                setAnswers({
                  ...answers,
                  authentication: { ...answers.authentication, linkedin: true }
                });
                handleNext();
              }}
            >
              <Text style={styles.authButtonLogo}>in</Text>
              <Text style={styles.authButtonTextLinkedIn}>Continue with LinkedIn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authButton}
              onPress={() => {
                setAnswers({
                  ...answers,
                  authentication: { ...answers.authentication, twitter: true }
                });
                handleNext();
              }}
            >
              <Text style={styles.authButtonLogo}>X</Text>
              <Text style={styles.authButtonText}>Continue with X</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authButton}
              onPress={() => {
                setAnswers({
                  ...answers,
                  authentication: { ...answers.authentication, gmail: true }
                });
                handleNext();
              }}
            >
              <Text style={styles.authButtonLogo}>M</Text>
              <Text style={styles.authButtonText}>Continue with Gmail</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleNext}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        );

      case 5:
        return (
          <View style={styles.pageContainerWithScroll}>
            <Text style={styles.pageTitle}>Question 1: What is your niche?</Text>
            <ScrollView 
              style={styles.optionsScroll}
              contentContainerStyle={styles.optionsScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {NICHE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    answers.niche === option && styles.optionButtonSelected
                  ]}
                  onPress={() => setAnswers({ ...answers, niche: option })}
                >
                  <Text style={[
                    styles.optionText,
                    answers.niche === option && styles.optionTextSelected
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 6:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Question 2: What is your angle?</Text>
            {ANGLE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  answers.angle === option && styles.optionButtonSelected
                ]}
                onPress={() => setAnswers({ ...answers, angle: option })}
              >
                <Text style={[
                  styles.optionText,
                  answers.angle === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 7:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Who is growing fast in your niche?</Text>
            <TextInput
              style={styles.textArea}
              value={answers.creatorResearch}
              onChangeText={(text) => setAnswers({ ...answers, creatorResearch: text })}
              placeholder="Enter creator names/handles"
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
            />
          </View>
        );

      case 8:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Who are you trying to reach?</Text>
            <TextInput
              style={styles.textArea}
              value={answers.audienceDefinition}
              onChangeText={(text) => setAnswers({ ...answers, audienceDefinition: text })}
              placeholder="Describe your target audience"
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
            />
          </View>
        );

      case 9:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Where do you want to post?</Text>
            <View style={styles.platformGrid}>
              {PLATFORM_OPTIONS.map((platform) => {
                const isSelected = answers.platformPreferences.includes(platform);
                return (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.platformButton,
                      isSelected && styles.platformButtonSelected
                    ]}
                    onPress={() => {
                      const newPrefs = isSelected
                        ? answers.platformPreferences.filter(p => p !== platform)
                        : [...answers.platformPreferences, platform];
                      setAnswers({ ...answers, platformPreferences: newPrefs });
                    }}
                  >
                    <Text style={styles.platformIcon}>{getPlatformIcon(platform)}</Text>
                    <Text style={[
                      styles.platformText,
                      isSelected && styles.platformTextSelected
                    ]}>
                      {platform}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 10:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>Where do you spend the most time?</Text>
            <View style={styles.platformGrid}>
              {PLATFORM_OPTIONS.map((platform) => {
                const isSelected = answers.platformUsage.includes(platform);
                return (
                  <TouchableOpacity
                    key={platform}
                    style={[
                      styles.platformButton,
                      isSelected && styles.platformButtonSelected
                    ]}
                    onPress={() => {
                      const newUsage = isSelected
                        ? answers.platformUsage.filter(p => p !== platform)
                        : [...answers.platformUsage, platform];
                      setAnswers({ ...answers, platformUsage: newUsage });
                    }}
                  >
                    <Text style={styles.platformIcon}>{getPlatformIcon(platform)}</Text>
                    <Text style={[
                      styles.platformText,
                      isSelected && styles.platformTextSelected
                    ]}>
                      {platform}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 11:
        return (
          <View style={styles.pageContainer}>
            <Text style={styles.pageTitle}>What's your goal?</Text>
            
            <Slider
              value={answers.goals.followers}
              min={0}
              max={1000000}
              onValueChange={(value) => setAnswers((prev) => ({
                ...prev,
                goals: { ...prev.goals, followers: value }
              }))}
              label="Followers"
              formatValue={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toString()}
            />

            <Slider
              value={answers.goals.views}
              min={0}
              max={10000000}
              onValueChange={(value) => setAnswers((prev) => ({
                ...prev,
                goals: { ...prev.goals, views: value }
              }))}
              label="Views"
              formatValue={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toString()}
            />

            <Slider
              value={answers.goals.subscribers}
              min={0}
              max={100000}
              onValueChange={(value) => setAnswers((prev) => ({
                ...prev,
                goals: { ...prev.goals, subscribers: value }
              }))}
              label="Subscribers"
              formatValue={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val.toString()}
            />
          </View>
        );

      default:
        return null;
    }
  };

  const renderProgressDots = () => {
    return (
      <View style={styles.progressDotsContainer}>
        {Array.from({ length: TOTAL_PAGES }).map((_, index) => {
          const isCompleted = index < currentPage;
          const isActive = index === currentPage;
          return (
            <View key={index} style={styles.progressDotContainer}>
              <View
                style={[
                  styles.progressDot,
                  (isCompleted || isActive) && styles.progressDotActive
                ]}
              />
              {isActive && <View style={styles.progressDotBar} />}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBarContainer}>
        {renderProgressDots()}
        <Text style={styles.progressText}>
          {currentPage + 1} / {TOTAL_PAGES}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderPage()}
      </ScrollView>

      {currentPage !== 4 && (
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, !isPageValid() && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!isPageValid()}
          >
            <Text style={styles.buttonTextPrimary}>
              {currentPage === 0 ? "Let's Begin" : currentPage === TOTAL_PAGES - 1 ? "Finish" : "Continue"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressBarContainer: {
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDotContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },
  progressDotActive: {
    backgroundColor: '#fff',
  },
  progressDotBar: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 0,
    flexGrow: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconsContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  starsIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  star: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  star1: {
    width: 6,
    height: 6,
  },
  star2: {
    width: 8,
    height: 8,
  },
  star3: {
    width: 7,
    height: 7,
  },
  barsIcon: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    height: 20,
  },
  bar: {
    width: 3,
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
  bar1: {
    height: 8,
  },
  bar2: {
    height: 12,
  },
  bar3: {
    height: 16,
  },
  bar4: {
    height: 20,
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#fff',
  },
  pageContainer: {
    flex: 1,
    minHeight: '100%',
  },
  pageContainerWithScroll: {
    flex: 1,
    height: '100%',
  },
  heartIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heartIcon: {
    fontSize: 32,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 32,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 20,
    marginBottom: 16,
    color: '#fff',
  },
  textArea: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#fff',
    borderWidth: 0,
  },
  optionsScroll: {
    flex: 1,
    marginTop: 8,
  },
  optionsScrollContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  optionButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 0,
  },
  optionButtonSelected: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#fff',
  },
  optionText: {
    fontSize: 16,
    color: '#fff',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 4,
  },
  platformButton: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  platformButtonSelected: {
    backgroundColor: '#2a2a2a',
    borderColor: '#444',
    borderWidth: 1.5,
    shadowOpacity: 0.3,
  },
  platformIcon: {
    fontSize: 36,
    marginBottom: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  platformText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  platformTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  profileIconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileIconHead: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#000',
    marginTop: 8,
    marginBottom: 2,
  },
  profileIconBody: {
    width: 50,
    height: 35,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    backgroundColor: '#000',
    marginTop: 0,
  },
  authButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 0,
  },
  authButtonLinkedIn: {
    backgroundColor: '#0077B5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 0,
  },
  authButtonLogo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  authButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  authButtonTextLinkedIn: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  skipButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 0,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  sliderContainer: {
    marginBottom: 32,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#fff',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderMin: {
    fontSize: 12,
    color: '#999',
    width: 30,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginHorizontal: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
  },
  sliderThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    position: 'absolute',
    top: -5,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  sliderMax: {
    fontSize: 12,
    color: '#999',
    width: 40,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 24,
    gap: 12,
    position: 'relative',
  },
  previewButton: {
    position: 'absolute',
    left: 24,
    bottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  previewButtonText: {
    fontSize: 14,
    color: '#fff',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2a2a2a',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
  },
  buttonTextPrimary: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
