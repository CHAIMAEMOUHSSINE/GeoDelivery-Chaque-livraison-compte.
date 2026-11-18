package com.geodelivery.optimization;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AlgorithmsTest {
    private double[][] matrix(Random random,int n) {
        double[] x=new double[n],y=new double[n]; double[][] d=new double[n][n];
        for(int i=0;i<n;i++) { x[i]=random.nextDouble()*100; y[i]=random.nextDouble()*100; }
        for(int i=0;i<n;i++) for(int j=0;j<n;j++) d[i][j]=Math.hypot(x[i]-x[j],y[i]-y[j]);
        return d;
    }
    @Test void nearestNeighborFollowsClosest() {
        double[][] d={{0,5,1},{5,0,4},{1,4,0}};
        assertEquals(List.of(0,2,1,0),NearestNeighborAlgorithm.solve(d,true));
        assertEquals(List.of(0,2,1),NearestNeighborAlgorithm.solve(d,false));
    }
    @Test void twoOptRemovesCrossing() {
        double[][] d={{0,1,Math.sqrt(2),1},{1,0,1,Math.sqrt(2)},{Math.sqrt(2),1,0,1},{1,Math.sqrt(2),1,0}};
        var better=TwoOptAlgorithm.improve(List.of(0,2,1,3,0),d,true);
        assertEquals(4,NearestNeighborAlgorithm.distance(better,d),1e-9);
    }
    @Test void openRouteCanImproveLastEndpoint() {
        double[][] d={{0,1,2,3},{1,0,1,2},{2,1,0,1},{3,2,1,0}};
        var better=TwoOptAlgorithm.improve(List.of(0,3,2,1),d,false);
        assertEquals(List.of(0,1,2,3),better);
    }
    @Test void randomizedOpenAndClosedToursNeverWorsenAndKeepAllStops() {
        var random=new Random(2026);
        for(boolean closed:List.of(false,true)) for(int k=0;k<100;k++) {
            double[][] d=matrix(random,2+random.nextInt(30));
            var initial=NearestNeighborAlgorithm.solve(d,closed);
            var better=TwoOptAlgorithm.improve(initial,d,closed);
            assertTrue(NearestNeighborAlgorithm.distance(better,d)<=NearestNeighborAlgorithm.distance(initial,d)+1e-8);
            assertEquals(0,better.getFirst());
            if(closed) assertEquals(0,better.getLast());
            assertEquals(d.length,new HashSet<>(better).size());
            assertEquals(d.length+(closed?1:0),better.size());
        }
    }
    @Test void coincidentPointsAndSingleStop() {
        double[][] d=new double[2][2];
        assertEquals(0,NearestNeighborAlgorithm.distance(TwoOptAlgorithm.improve(List.of(0,1,0),d,true),d));
        assertEquals(List.of(0,1),NearestNeighborAlgorithm.solve(d,false));
    }
    @Test void doesNotMutateInput() {
        var input=List.of(0,2,1,0);
        TwoOptAlgorithm.improve(input,new double[3][3],true);
        assertEquals(List.of(0,2,1,0),input);
    }
}
