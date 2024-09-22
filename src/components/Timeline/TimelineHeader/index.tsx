import { AnimatedFlashList, ListRenderItemInfo } from '@shopify/flash-list';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { format, getISOWeek } from 'date-fns'; // Import des fonctions nécessaires
import { fr } from 'date-fns/locale';
import { DEFAULT_PROPS } from '../../../constants';
import { useTimelineCalendarContext } from '../../../context/TimelineProvider';
import type { DayBarItemProps, HighlightDates } from '../../../types';
import MultipleDayBar from './MultipleDayBar';
import ProgressBar from './ProgressBar';
import SingleDayBar from './SingleDayBar';

interface TimelineHeaderProps {
  renderDayBarItem?: (props: DayBarItemProps) => JSX.Element;
  onPressDayNum?: (date: string) => void;
  isLoading?: boolean;
  highlightDates?: HighlightDates;
  selectedEventId?: string;
}

const TimelineHeader = ({
                          renderDayBarItem,
                          onPressDayNum,
                          isLoading,
                          highlightDates,
                          selectedEventId,
                        }: TimelineHeaderProps) => {
  const {
    syncedLists,
    viewMode,
    dayBarListRef,
    pages,
    timelineWidth,
    rightSideWidth,
    currentIndex,
    hourWidth,
    columnWidth,
    theme,
    locale,
    tzOffset,
    currentDate,
  } = useTimelineCalendarContext();

  const [startDate, setStartDate] = useState(
      pages[viewMode].data[pages[viewMode].index] || ''
  );
  const [monthName, setMonthName] = useState('');
  const [weekNumber, setWeekNumber] = useState(0);

  const dayBarIndex = useRef(pages.week.index);

  const _renderSingleDayItem = ({
                                  item,
                                  extraData,
                                }: ListRenderItemInfo<string>) => {
    const dayItemProps = {
      width: timelineWidth,
      startDate: item,
      columnWidth,
      hourWidth,
      viewMode,
      onPressDayNum,
      theme: extraData.theme,
      locale: extraData.locale,
      highlightDates: extraData.highlightDates,
      tzOffset,
      currentDate: extraData.currentDate,
    };

    if (renderDayBarItem) {
      return renderDayBarItem(dayItemProps);
    }

    return <SingleDayBar {...dayItemProps} />;
  };

  const _renderMultipleDayItem = ({
                                    item,
                                    extraData,
                                  }: ListRenderItemInfo<string>) => {
    const dayItemProps = {
      width: rightSideWidth,
      startDate: item,
      columnWidth,
      hourWidth,
      viewMode,
      onPressDayNum,
      theme: extraData.theme,
      locale: extraData.locale,
      highlightDates: extraData.highlightDates,
      tzOffset,
      currentDate: extraData.currentDate,
    };

    if (renderDayBarItem) {
      return renderDayBarItem(dayItemProps);
    }

    return <MultipleDayBar {...dayItemProps} />;
  };

  const extraValues = useMemo(
      () => ({ locale, highlightDates, theme, currentDate }),
      [locale, highlightDates, theme, currentDate]
  );

  useEffect(() => {
    // Met à jour monthName et weekNumber à chaque changement de startDate
    if (startDate) {
      const dateObj = new Date(startDate);
      setWeekNumber(getISOWeek(dateObj));
      setMonthName(format(dateObj, 'MMM', { locale: fr }));
    }
  }, [startDate]);

  const _renderDayBarList = () => {
    const listProps = {
      ref: dayBarListRef,
      keyExtractor: (item: string) => item,
      scrollEnabled: false,
      disableHorizontalListHeightMeasurement: true,
      showsHorizontalScrollIndicator: false,
      horizontal: true,
      bounces: false,
      scrollEventThrottle: 16,
      pagingEnabled: true,
      extraData: extraValues,
      onScroll: (e: any) => {
        const x = e.nativeEvent.contentOffset.x;
        const width = e.nativeEvent.layoutMeasurement.width;
        const pageIndex = Math.round(x / width);

        if (dayBarIndex.current !== pageIndex) {
          dayBarIndex.current = pageIndex;
          const newStartDate = pages[viewMode].data[pageIndex];

          if (newStartDate) {
            setStartDate(newStartDate);
          }
        }
      },
    };

    if (viewMode === 'day') {
      return (
          <View>
            <View
                style={[
                  styles.leftBarDay,
                  {
                    width: hourWidth,
                    height: DEFAULT_PROPS.DAY_BAR_HEIGHT,
                    backgroundColor: theme.backgroundColor,
                  },
                ]}
            >
              <View style={theme.leftBar}>
                <Text style={theme.leftBarText}>{monthName}</Text>
              </View>
              <View style={theme.leftBar}>
                <Text style={theme.leftBarText}>Sem {weekNumber}</Text>
              </View>
            </View>

            <AnimatedFlashList
                {...listProps}
                data={pages[viewMode].data}
                initialScrollIndex={pages[viewMode].index}
                estimatedItemSize={timelineWidth}
                estimatedListSize={{
                  width: timelineWidth,
                  height: DEFAULT_PROPS.DAY_BAR_HEIGHT,
                }}
                renderItem={_renderSingleDayItem}
                onScroll={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  const width = e.nativeEvent.layoutMeasurement.width;
                  const pageIndex = Math.round(x / width);
                  if (dayBarIndex.current !== pageIndex) {
                    dayBarIndex.current = pageIndex;
                    const newStartDate = pages[viewMode].data[pageIndex];
                    if (newStartDate) {
                      setStartDate(newStartDate);
                    }
                  }
                }}
            />
          </View>
      );
    }

    return (
        <View style={styles.multipleDayContainer}>
          <View style={[styles.leftBarContainer, { width: hourWidth }]}>
            <View style={theme.leftBar}>
              <Text style={theme.leftBarText}>{monthName}</Text>
            </View>
            <View style={theme.leftBar}>
              <Text style={theme.leftBarText}>Sem {weekNumber}</Text>
            </View>
          </View>
          <View style={{ width: rightSideWidth }}>
            <AnimatedFlashList
                {...listProps}
                data={pages[viewMode].data}
                initialScrollIndex={pages[viewMode].index}
                estimatedItemSize={rightSideWidth}
                estimatedListSize={{
                  width: rightSideWidth,
                  height: DEFAULT_PROPS.DAY_BAR_HEIGHT,
                }}
                renderItem={_renderMultipleDayItem}
            />
          </View>
        </View>
    );
  };

  useAnimatedReaction(
      () => currentIndex.value,
      (index) => {
        if (syncedLists) {
          return;
        }

        const dateByIndex = pages[viewMode].data[index];
        if (dateByIndex) {
          runOnJS(setStartDate)(dateByIndex);
        }
      },
      [viewMode, syncedLists]
  );

  const _renderDayBarView = () => {
    if (viewMode === 'day') {
      return _renderSingleDayItem({
        item: startDate,
        extraData: extraValues,
        index: 0,
        target: 'Cell',
      });
    }
    return (
        <View style={styles.multipleDayContainer}>
          <View style={{ width: hourWidth }} />
          {_renderMultipleDayItem({
            item: startDate,
            extraData: extraValues,
            index: 0,
            target: 'Cell',
          })}
        </View>
    );
  };

  return (
      <View style={{ backgroundColor: theme.backgroundColor }}>
        {syncedLists ? _renderDayBarList() : _renderDayBarView()}
        {selectedEventId && <View style={styles.disabledFrame} />}
        {isLoading && <ProgressBar barColor={theme.loadingBarColor} />}
      </View>
  );
};

export default TimelineHeader;

const styles = StyleSheet.create({
  multipleDayContainer: { flexDirection: 'row' },
  disabledFrame: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0)',
  },
  leftBarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  leftBarDay: {
    position: 'absolute',
    gap: 5,
    zIndex: 99,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
